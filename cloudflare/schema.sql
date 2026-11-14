-- Cloudflare D1 Database Schema for Shop Manager
-- This stores all operational data: products, categories, customers, sales, transactions, services, repairs, expenses.
-- NOTE: User authentication and credentials remain strictly on Firebase as configured!

CREATE TABLE IF NOT EXISTS products (
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
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  nameFr TEXT,
  nameAr TEXT,
  color TEXT,
  createdAt TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  address TEXT,
  debt REAL DEFAULT 0,
  description TEXT,
  createdBy TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS sales (
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
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT,
  amount REAL DEFAULT 0,
  referenceId TEXT,
  customerId TEXT,
  description TEXT,
  cashier TEXT,
  cashierName TEXT,
  date TEXT
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  nameFr TEXT,
  nameAr TEXT,
  price REAL DEFAULT 0,
  category TEXT,
  description TEXT,
  createdBy TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS repairs (
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
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  title TEXT,
  amount REAL DEFAULT 0,
  category TEXT,
  note TEXT,
  date TEXT,
  createdBy TEXT,
  createdByName TEXT
);

CREATE TABLE IF NOT EXISTS store_info (
  id TEXT PRIMARY KEY,
  name TEXT,
  phone TEXT,
  address TEXT,
  footer TEXT,
  nif TEXT,
  rc TEXT,
  updatedAt TEXT
);
