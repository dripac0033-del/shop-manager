/**
 * Cloudflare Worker API for Shop Manager + Cloudflare D1
 * Deploy this worker to expose a fast, secure, global REST API connected to your D1 database.
 * Supports:
 * - CORS enabled for Web & Mobile
 * - Health check with D1 DB ping
 * - Direct SQL query & Batch queries
 * - Instant IPTV Webhook / API Ingestion (/api/iptv)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Full CORS Headers for cross-origin browser & extension requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check & DB connection verification
    if (url.pathname === '/' || url.pathname === '/health') {
      let dbConnected = false;
      let dbError = null;
      try {
        if (env && env.DB) {
          const test = await env.DB.prepare('SELECT 1 as alive').first();
          dbConnected = test && test.alive === 1;
        } else {
          dbError = 'env.DB binding non configuré dans wrangler.toml';
        }
      } catch (e) {
        dbError = e.message;
      }

      return new Response(JSON.stringify({
        status: dbConnected ? 'ok' : 'degraded',
        service: 'shop-manager-cloudflare-d1',
        databaseBound: !!(env && env.DB),
        databaseConnected: dbConnected,
        dbError,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Direct SQL Query Endpoint (Used by App)
    if (url.pathname === '/query' && request.method === 'POST') {
      try {
        if (!env || !env.DB) {
          return new Response(JSON.stringify({ error: 'Base de données D1 non attachée (env.DB manquant).' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await request.json();
        const { sql, params = [] } = body;

        if (!sql) {
          return new Response(JSON.stringify({ error: 'Paramètre SQL manquant.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const stmt = env.DB.prepare(sql).bind(...params);
        let res;
        const trimmedSql = sql.trim().toUpperCase();
        if (trimmedSql.startsWith('SELECT') || trimmedSql.startsWith('PRAGMA')) {
          const { results } = await stmt.all();
          res = results;
        } else {
          res = await stmt.run();
        }

        return new Response(JSON.stringify({ success: true, results: res }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Batch Queries Endpoint (for bulk sync & transactions)
    if (url.pathname === '/batch' && request.method === 'POST') {
      try {
        if (!env || !env.DB) {
          return new Response(JSON.stringify({ error: 'Base D1 non attachée.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await request.json();
        const { statements = [] } = body; // Array of { sql, params }
        if (!Array.isArray(statements) || statements.length === 0) {
          return new Response(JSON.stringify({ error: 'statements array requis.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const prepared = statements.map((s) => env.DB.prepare(s.sql).bind(...(s.params || [])));
        const batchResults = await env.DB.batch(prepared);

        return new Response(JSON.stringify({ success: true, count: batchResults.length }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Instant IPTV Code Ingestion Webhook / API Endpoint
    // Used by: Supplier Webhook, Chrome Bookmarklet / Tampermonkey script, or curl
    if ((url.pathname === '/api/iptv' || url.pathname === '/api/iptv-webhook') && request.method === 'POST') {
      try {
        if (!env || !env.DB) {
          return new Response(JSON.stringify({ error: 'Base D1 non attachée.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data = await request.json();
        if (!data) {
          return new Response(JSON.stringify({ error: 'Corps JSON requis.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const id = data.id || `iptv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const code = (data.code || data.pin || data.subscriptionCode || '').trim();
        const serverName = (data.serverName || data.server || data.name || 'Serveur IPTV').trim();
        const serviceType = data.serviceType || (data.host || data.username ? 'xtream' : 'code');
        const host = (data.host || data.url || '').trim();
        const port = String(data.port || '').trim();
        const username = (data.username || data.user || '').trim();
        const password = (data.password || data.pass || '').trim();
        const macAddress = (data.macAddress || data.mac || '').trim();
        const m3uUrl = (data.m3uUrl || data.m3u || '').trim();
        const durationMonths = Number(data.durationMonths || data.duration || 12);
        const buyPrice = Number(data.buyPrice || data.cost || 0);
        const sellPrice = Number(data.sellPrice || data.price || 0);
        const status = data.status || 'in_stock';
        const notes = data.notes || data.details || '';
        const supplierSite = data.supplierSite || request.headers.get('origin') || '';
        const now = new Date().toISOString();

        // Calculate expiration date if not provided
        let expirationDate = data.expirationDate || null;
        if (!expirationDate) {
          const exp = new Date();
          exp.setMonth(exp.getMonth() + durationMonths);
          expirationDate = exp.toISOString();
        }

        // Auto ensure table exists
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS iptv_codes (
          id TEXT PRIMARY KEY,
          code TEXT,
          serverName TEXT,
          serviceType TEXT,
          host TEXT,
          port TEXT,
          username TEXT,
          password TEXT,
          macAddress TEXT,
          m3uUrl TEXT,
          durationMonths INTEGER DEFAULT 12,
          purchaseDate TEXT,
          activationDate TEXT,
          expirationDate TEXT,
          buyPrice REAL DEFAULT 0,
          sellPrice REAL DEFAULT 0,
          status TEXT DEFAULT 'in_stock',
          customerId TEXT,
          customerName TEXT,
          customerPhone TEXT,
          supplierSite TEXT,
          notes TEXT,
          createdAt TEXT,
          updatedAt TEXT
        );`).run();

        const insertSql = `INSERT INTO iptv_codes (
          id, code, serverName, serviceType, host, port, username, password, macAddress, m3uUrl,
          durationMonths, purchaseDate, activationDate, expirationDate, buyPrice, sellPrice, status,
          customerId, customerName, customerPhone, supplierSite, notes, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          code=excluded.code,
          serverName=excluded.serverName,
          serviceType=excluded.serviceType,
          host=excluded.host,
          port=excluded.port,
          username=excluded.username,
          password=excluded.password,
          macAddress=excluded.macAddress,
          m3uUrl=excluded.m3uUrl,
          durationMonths=excluded.durationMonths,
          expirationDate=excluded.expirationDate,
          buyPrice=excluded.buyPrice,
          sellPrice=excluded.sellPrice,
          status=excluded.status,
          notes=excluded.notes,
          updatedAt=excluded.updatedAt;`;

        await env.DB.prepare(insertSql).bind(
          id,
          code,
          serverName,
          serviceType,
          host,
          port,
          username,
          password,
          macAddress,
          m3uUrl,
          durationMonths,
          now, // purchaseDate
          null, // activationDate
          expirationDate,
          buyPrice,
          sellPrice,
          status,
          data.customerId || '',
          data.customerName || '',
          data.customerPhone || '',
          supplierSite,
          notes,
          now,
          now
        ).run();

        return new Response(JSON.stringify({
          success: true,
          id,
          message: 'Code IPTV reçu et enregistré avec succès dans Cloudflare D1 !',
          item: {
            id,
            serverName,
            serviceType,
            code,
            username,
            durationMonths,
            status,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Endpoint introuvable.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};
