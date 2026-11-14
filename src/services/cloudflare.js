import AsyncStorage from '@react-native-async-storage/async-storage';

const CLOUDFLARE_CONFIG_KEY = '@cloudflare_config';

/**
 * Cloudflare Configuration Default Structure
 * Supports:
 * 1. Direct Cloudflare D1 REST API (Account ID, Database ID, API Token)
 * 2. Cloudflare Worker REST API URL (e.g. https://shop-api.yourname.workers.dev)
 */
export const DEFAULT_CLOUDFLARE_CONFIG = {
  accountId: '',
  databaseId: '',
  apiToken: '',
  workerUrl: '', // Optional: Cloudflare Worker API URL
};

/**
 * Get stored Cloudflare configuration from AsyncStorage
 */
export async function getStoredCloudflareConfig() {
  try {
    const raw = await AsyncStorage.getItem(CLOUDFLARE_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to read Cloudflare config:', err);
  }
  return DEFAULT_CLOUDFLARE_CONFIG;
}

/**
 * Save Cloudflare configuration to AsyncStorage
 */
export async function saveCloudflareConfig(config) {
  try {
    const cleanConfig = {
      accountId: (config.accountId || '').trim(),
      databaseId: (config.databaseId || '').trim(),
      apiToken: (config.apiToken || '').trim(),
      workerUrl: (config.workerUrl || '').trim().replace(/\/+$/, ''),
    };
    await AsyncStorage.setItem(CLOUDFLARE_CONFIG_KEY, JSON.stringify(cleanConfig));
    return cleanConfig;
  } catch (err) {
    console.warn('Failed to save Cloudflare config:', err);
    throw err;
  }
}

/**
 * Helper to execute a SQL query against Cloudflare D1 HTTP REST API
 * Or dispatch to Cloudflare Worker if workerUrl is provided
 */
export async function executeD1Query(sql, params = [], config = null) {
  const conf = config || (await getStoredCloudflareConfig());

  // 1. If Cloudflare Worker URL is specified, use worker endpoint
  if (conf.workerUrl) {
    try {
      const res = await fetch(`${conf.workerUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(conf.apiToken ? { Authorization: `Bearer ${conf.apiToken}` } : {}),
        },
        body: JSON.stringify({ sql, params }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Erreur Worker HTTP ${res.status}`);
      }
      return data.results || data;
    } catch (err) {
      console.warn('Cloudflare Worker query error:', err);
      throw err;
    }
  }

  // 2. Direct Cloudflare D1 REST API
  if (!conf.accountId || !conf.databaseId || !conf.apiToken) {
    throw new Error('Configuration Cloudflare D1 incomplète (Account ID, Database ID ou API Token manquant).');
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${conf.accountId}/d1/database/${conf.databaseId}/query`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${conf.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql,
        params,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const errDetail = data?.errors?.[0]?.message || `Erreur Cloudflare D1 HTTP ${res.status}`;
      throw new Error(errDetail);
    }

    const firstResult = data.result && data.result[0];
    return firstResult?.results || [];
  } catch (err) {
    console.warn('Cloudflare D1 REST query error:', err);
    throw err;
  }
}

/**
 * Test health & connectivity of Cloudflare D1 / Worker
 */
export async function checkCloudflareHealth(customConfig = null) {
  try {
    const conf = customConfig || (await getStoredCloudflareConfig());
    if (!conf.workerUrl && (!conf.accountId || !conf.databaseId || !conf.apiToken)) {
      return {
        success: false,
        status: 'NOT_CONFIGURED',
        error: 'Cloudflare non configuré (renseignez vos identifiants D1 ou Worker).',
      };
    }

    // Try a simple SELECT 1 query
    await executeD1Query('SELECT 1 as is_alive', [], conf);
    return {
      success: true,
      status: 'OK',
      message: 'Connexion Cloudflare D1 établie et opérationnelle !',
    };
  } catch (err) {
    return {
      success: false,
      status: 'ERROR',
      error: err.message || 'Impossible de joindre la base Cloudflare D1.',
    };
  }
}

/**
 * Initialize all database tables on Cloudflare D1
 * (Excludes 'users', which is strictly stored on Firebase as requested)
 */
export async function initCloudflareTables(config = null) {
  const tableDefinitions = [
    // 1. Products
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      barcode TEXT,
      nameFr TEXT,
      nameAr TEXT,
      category TEXT,
      buyPrice REAL DEFAULT 0,
      sellPrice REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      minStock INTEGER DEFAULT 5,
      createdBy TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );`,

    // 2. Categories
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      nameFr TEXT,
      nameAr TEXT,
      color TEXT,
      createdAt TEXT
    );`,

    // 3. Customers (Includes description for notes/client history)
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      address TEXT,
      debt REAL DEFAULT 0,
      description TEXT,
      createdBy TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );`,

    // 4. Sales
    `CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      date TEXT,
      total REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      paymentMethod TEXT,
      paidAmount REAL DEFAULT 0,
      customerId TEXT,
      cashier TEXT,
      cashierName TEXT,
      userId TEXT,
      status TEXT,
      profit REAL DEFAULT 0,
      costOfGoods REAL DEFAULT 0,
      items_json TEXT,
      returns_json TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );`,

    // 5. Transactions Ledger
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT,
      amount REAL DEFAULT 0,
      referenceId TEXT,
      customerId TEXT,
      description TEXT,
      cashier TEXT,
      cashierName TEXT,
      date TEXT
    );`,

    // 6. Services
    `CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      nameFr TEXT,
      nameAr TEXT,
      price REAL DEFAULT 0,
      category TEXT,
      description TEXT,
      createdBy TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );`,

    // 7. Repairs (Atelier maintenance)
    `CREATE TABLE IF NOT EXISTS repairs (
      id TEXT PRIMARY KEY,
      ticketNumber TEXT,
      customerName TEXT,
      customerPhone TEXT,
      deviceModel TEXT,
      issueDescription TEXT,
      status TEXT,
      estimatedCost REAL DEFAULT 0,
      finalCost REAL DEFAULT 0,
      depositPaid REAL DEFAULT 0,
      dateReceived TEXT,
      dateDelivered TEXT,
      technician TEXT,
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );`,

    // 8. Expenses
    `CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      title TEXT,
      amount REAL DEFAULT 0,
      category TEXT,
      note TEXT,
      date TEXT,
      createdBy TEXT,
      createdByName TEXT
    );`,

    // 9. Store Settings
    `CREATE TABLE IF NOT EXISTS store_info (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      address TEXT,
      footer TEXT,
      nif TEXT,
      rc TEXT,
      updatedAt TEXT
    );`,
  ];

  for (const sql of tableDefinitions) {
    await executeD1Query(sql, [], config);
  }

  return { success: true };
}

/* ==============================================================
 * CRUD OPERATIONS FOR CLOUDFLARE D1
 * ============================================================== */

// --- Products ---
export async function saveProductToCloudflare(p) {
  const sql = `INSERT INTO products (id, barcode, nameFr, nameAr, category, buyPrice, sellPrice, stock, minStock, createdBy, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      barcode=excluded.barcode,
      nameFr=excluded.nameFr,
      nameAr=excluded.nameAr,
      category=excluded.category,
      buyPrice=excluded.buyPrice,
      sellPrice=excluded.sellPrice,
      stock=excluded.stock,
      minStock=excluded.minStock,
      updatedAt=excluded.updatedAt;`;

  return executeD1Query(sql, [
    String(p.id),
    p.barcode || '',
    p.nameFr || '',
    p.nameAr || '',
    p.category || 'Alimentation',
    Number(p.buyPrice || 0),
    Number(p.sellPrice || 0),
    Number(p.stock || 0),
    Number(p.minStock || 5),
    p.createdBy || 'admin',
    p.createdAt || new Date().toISOString(),
    new Date().toISOString(),
  ]);
}

export async function deleteProductFromCloudflare(id) {
  return executeD1Query('DELETE FROM products WHERE id = ?;', [String(id)]);
}

export async function fetchProductsFromCloudflare() {
  const rows = await executeD1Query('SELECT * FROM products ORDER BY nameFr ASC;');
  return rows.map((r) => ({
    ...r,
    buyPrice: Number(r.buyPrice || 0),
    sellPrice: Number(r.sellPrice || 0),
    stock: Number(r.stock || 0),
    minStock: Number(r.minStock || 5),
  }));
}

// --- Categories ---
export async function saveCategoryToCloudflare(c) {
  const sql = `INSERT INTO categories (id, nameFr, nameAr, color, createdAt)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      nameFr=excluded.nameFr,
      nameAr=excluded.nameAr,
      color=excluded.color;`;

  return executeD1Query(sql, [
    String(c.id),
    c.nameFr || '',
    c.nameAr || '',
    c.color || '#10b981',
    c.createdAt || new Date().toISOString(),
  ]);
}

export async function deleteCategoryFromCloudflare(id) {
  return executeD1Query('DELETE FROM categories WHERE id = ?;', [String(id)]);
}

export async function fetchCategoriesFromCloudflare() {
  return executeD1Query('SELECT * FROM categories ORDER BY nameFr ASC;');
}

// --- Customers (With description support) ---
export async function saveCustomerToCloudflare(c) {
  const sql = `INSERT INTO customers (id, name, phone, address, debt, description, createdBy, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      phone=excluded.phone,
      address=excluded.address,
      debt=excluded.debt,
      description=excluded.description,
      updatedAt=excluded.updatedAt;`;

  return executeD1Query(sql, [
    String(c.id),
    c.name || '',
    c.phone || '',
    c.address || '',
    Number(c.debt || 0),
    c.description || '',
    c.createdBy || 'admin',
    c.createdAt || new Date().toISOString(),
    new Date().toISOString(),
  ]);
}

export async function deleteCustomerFromCloudflare(id) {
  return executeD1Query('DELETE FROM customers WHERE id = ?;', [String(id)]);
}

export async function fetchCustomersFromCloudflare() {
  const rows = await executeD1Query('SELECT * FROM customers ORDER BY name ASC;');
  return rows.map((r) => ({
    ...r,
    debt: Number(r.debt || 0),
  }));
}

// --- Sales & Returns ---
export async function saveSaleToCloudflare(s) {
  const sql = `INSERT INTO sales (id, date, total, subtotal, discount, paymentMethod, paidAmount, customerId, cashier, cashierName, userId, status, profit, costOfGoods, items_json, returns_json, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status=excluded.status,
      returns_json=excluded.returns_json,
      updatedAt=excluded.updatedAt;`;

  return executeD1Query(sql, [
    String(s.id),
    s.date || new Date().toISOString(),
    Number(s.total || 0),
    Number(s.subtotal || 0),
    Number(s.discount || 0),
    s.paymentMethod || 'cash',
    Number(s.paidAmount || 0),
    s.customerId || '',
    s.cashier || 'admin',
    s.cashierName || 'Admin',
    s.userId || '',
    s.status || 'completed',
    Number(s.profit || 0),
    Number(s.costOfGoods || 0),
    JSON.stringify(s.items || []),
    JSON.stringify(s.returns || []),
    s.createdAt || new Date().toISOString(),
    new Date().toISOString(),
  ]);
}

export async function fetchSalesFromCloudflare() {
  const rows = await executeD1Query('SELECT * FROM sales ORDER BY date DESC;');
  return rows.map((r) => {
    let items = [];
    let returns = [];
    try {
      if (r.items_json) items = JSON.parse(r.items_json);
    } catch (e) {}
    try {
      if (r.returns_json) returns = JSON.parse(r.returns_json);
    } catch (e) {}

    return {
      ...r,
      total: Number(r.total || 0),
      subtotal: Number(r.subtotal || 0),
      discount: Number(r.discount || 0),
      paidAmount: Number(r.paidAmount || 0),
      profit: Number(r.profit || 0),
      costOfGoods: Number(r.costOfGoods || 0),
      items,
      returns,
    };
  });
}

// --- Transactions (Immutable Ledger) ---
export async function saveTransactionToCloudflare(tx) {
  const sql = `INSERT INTO transactions (id, type, amount, referenceId, customerId, description, cashier, cashierName, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING;`;

  return executeD1Query(sql, [
    String(tx.id),
    tx.type || 'sale',
    Number(tx.amount || 0),
    tx.referenceId || '',
    tx.customerId || '',
    tx.description || '',
    tx.cashier || 'admin',
    tx.cashierName || 'Admin',
    tx.date || new Date().toISOString(),
  ]);
}

export async function fetchTransactionsFromCloudflare() {
  const rows = await executeD1Query('SELECT * FROM transactions ORDER BY date DESC;');
  return rows.map((r) => ({
    ...r,
    amount: Number(r.amount || 0),
  }));
}

// --- Services ---
export async function saveServiceToCloudflare(srv) {
  const sql = `INSERT INTO services (id, nameFr, nameAr, price, category, description, createdBy, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      nameFr=excluded.nameFr,
      nameAr=excluded.nameAr,
      price=excluded.price,
      category=excluded.category,
      description=excluded.description,
      updatedAt=excluded.updatedAt;`;

  return executeD1Query(sql, [
    String(srv.id),
    srv.nameFr || '',
    srv.nameAr || '',
    Number(srv.price || 0),
    srv.category || 'Service',
    srv.description || '',
    srv.createdBy || 'admin',
    srv.createdAt || new Date().toISOString(),
    new Date().toISOString(),
  ]);
}

export async function deleteServiceFromCloudflare(id) {
  return executeD1Query('DELETE FROM services WHERE id = ?;', [String(id)]);
}

export async function fetchServicesFromCloudflare() {
  const rows = await executeD1Query('SELECT * FROM services ORDER BY nameFr ASC;');
  return rows.map((r) => ({
    ...r,
    price: Number(r.price || 0),
  }));
}

// --- Repairs ---
export async function saveRepairToCloudflare(r) {
  const sql = `INSERT INTO repairs (id, ticketNumber, customerName, customerPhone, deviceModel, issueDescription, status, estimatedCost, finalCost, depositPaid, dateReceived, dateDelivered, technician, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status=excluded.status,
      estimatedCost=excluded.estimatedCost,
      finalCost=excluded.finalCost,
      depositPaid=excluded.depositPaid,
      dateDelivered=excluded.dateDelivered,
      technician=excluded.technician,
      notes=excluded.notes,
      updatedAt=excluded.updatedAt;`;

  return executeD1Query(sql, [
    String(r.id),
    r.ticketNumber || '',
    r.customerName || '',
    r.customerPhone || '',
    r.deviceModel || '',
    r.issueDescription || '',
    r.status || 'received',
    Number(r.estimatedCost || 0),
    Number(r.finalCost || 0),
    Number(r.depositPaid || 0),
    r.dateReceived || new Date().toISOString(),
    r.dateDelivered || null,
    r.technician || 'admin',
    r.notes || '',
    r.createdAt || new Date().toISOString(),
    new Date().toISOString(),
  ]);
}

export async function deleteRepairFromCloudflare(id) {
  return executeD1Query('DELETE FROM repairs WHERE id = ?;', [String(id)]);
}

export async function fetchRepairsFromCloudflare() {
  const rows = await executeD1Query('SELECT * FROM repairs ORDER BY dateReceived DESC;');
  return rows.map((r) => ({
    ...r,
    estimatedCost: Number(r.estimatedCost || 0),
    finalCost: Number(r.finalCost || 0),
    depositPaid: Number(r.depositPaid || 0),
  }));
}

// --- Expenses ---
export async function saveExpenseToCloudflare(e) {
  const sql = `INSERT INTO expenses (id, title, amount, category, note, date, createdBy, createdByName)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      amount=excluded.amount,
      category=excluded.category,
      note=excluded.note;`;

  return executeD1Query(sql, [
    String(e.id),
    e.title || '',
    Number(e.amount || 0),
    e.category || 'other',
    e.note || '',
    e.date || new Date().toISOString(),
    e.createdBy || 'admin',
    e.createdByName || 'Admin',
  ]);
}

export async function deleteExpenseFromCloudflare(id) {
  return executeD1Query('DELETE FROM expenses WHERE id = ?;', [String(id)]);
}

export async function fetchExpensesFromCloudflare() {
  const rows = await executeD1Query('SELECT * FROM expenses ORDER BY date DESC;');
  return rows.map((r) => ({
    ...r,
    amount: Number(r.amount || 0),
  }));
}

// --- Store Info ---
export async function saveStoreInfoToCloudflare(info) {
  const sql = `INSERT INTO store_info (id, name, phone, address, footer, nif, rc, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      phone=excluded.phone,
      address=excluded.address,
      footer=excluded.footer,
      nif=excluded.nif,
      rc=excluded.rc,
      updatedAt=excluded.updatedAt;`;

  return executeD1Query(sql, [
    'store_info_default',
    info.name || '',
    info.phone || '',
    info.address || '',
    info.footer || '',
    info.nif || '',
    info.rc || '',
    new Date().toISOString(),
  ]);
}

export async function fetchStoreInfoFromCloudflare() {
  const rows = await executeD1Query('SELECT * FROM store_info WHERE id = ?;', ['store_info_default']);
  return rows.length > 0 ? rows[0] : null;
}

/* ==============================================================
 * BULK UPLOAD & DOWNLOAD FOR CLOUDFLARE
 * ============================================================== */

export async function uploadAllDataToCloudflare(allData) {
  await initCloudflareTables();

  const counts = {
    products: 0,
    categories: 0,
    customers: 0,
    sales: 0,
    transactions: 0,
    services: 0,
    repairs: 0,
    expenses: 0,
  };

  if (Array.isArray(allData.products)) {
    for (const p of allData.products) {
      if (p && p.id) {
        await saveProductToCloudflare(p);
        counts.products++;
      }
    }
  }

  if (Array.isArray(allData.categories)) {
    for (const c of allData.categories) {
      if (c && c.id) {
        await saveCategoryToCloudflare(c);
        counts.categories++;
      }
    }
  }

  if (Array.isArray(allData.customers)) {
    for (const cu of allData.customers) {
      if (cu && cu.id) {
        await saveCustomerToCloudflare(cu);
        counts.customers++;
      }
    }
  }

  if (Array.isArray(allData.sales)) {
    for (const s of allData.sales) {
      if (s && s.id) {
        await saveSaleToCloudflare(s);
        counts.sales++;
      }
    }
  }

  if (Array.isArray(allData.transactions)) {
    for (const tx of allData.transactions) {
      if (tx && tx.id) {
        await saveTransactionToCloudflare(tx);
        counts.transactions++;
      }
    }
  }

  if (Array.isArray(allData.services)) {
    for (const sv of allData.services) {
      if (sv && sv.id) {
        await saveServiceToCloudflare(sv);
        counts.services++;
      }
    }
  }

  if (Array.isArray(allData.repairs)) {
    for (const r of allData.repairs) {
      if (r && r.id) {
        await saveRepairToCloudflare(r);
        counts.repairs++;
      }
    }
  }

  if (Array.isArray(allData.expenses)) {
    for (const e of allData.expenses) {
      if (e && e.id) {
        await saveExpenseToCloudflare(e);
        counts.expenses++;
      }
    }
  }

  if (allData.storeInfo) {
    await saveStoreInfoToCloudflare(allData.storeInfo);
  }

  return { success: true, counts };
}

export async function fetchAllDataFromCloudflare() {
  const [
    products,
    categories,
    customers,
    sales,
    transactions,
    services,
    repairs,
    expenses,
    storeInfo,
  ] = await Promise.all([
    fetchProductsFromCloudflare().catch(() => []),
    fetchCategoriesFromCloudflare().catch(() => []),
    fetchCustomersFromCloudflare().catch(() => []),
    fetchSalesFromCloudflare().catch(() => []),
    fetchTransactionsFromCloudflare().catch(() => []),
    fetchServicesFromCloudflare().catch(() => []),
    fetchRepairsFromCloudflare().catch(() => []),
    fetchExpensesFromCloudflare().catch(() => []),
    fetchStoreInfoFromCloudflare().catch(() => null),
  ]);

  return {
    products,
    categories,
    customers,
    sales,
    transactions,
    services,
    repairs,
    expenses,
    storeInfo,
  };
}
