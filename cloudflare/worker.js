/**
 * Cloudflare Worker API for Shop Manager + Cloudflare D1
 * Deploy this worker to expose a fast, secure, global REST API connected to your D1 database.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'shop-manager-cloudflare-d1' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Direct SQL Query Endpoint (Used by App)
    if (url.pathname === '/query' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { sql, params = [] } = body;

        if (!sql) {
          return new Response(JSON.stringify({ error: 'Missing SQL query' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const stmt = env.DB.prepare(sql).bind(...params);
        let res;
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
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

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  },
};
