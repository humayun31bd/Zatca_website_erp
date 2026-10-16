const Database = require('better-sqlite3');

const db = new Database('sqlite.db');

console.log('Running migration: creating delivery orders tables...');

// 1. delivery_drivers table
db.exec(`
CREATE TABLE IF NOT EXISTS delivery_drivers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'bike',
  vehicle_plate TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_available INTEGER NOT NULL DEFAULT 1,
  current_latitude REAL,
  current_longitude REAL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
`);

// 2. delivery_orders table
db.exec(`
CREATE TABLE IF NOT EXISTS delivery_orders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  order_number TEXT NOT NULL UNIQUE,
  invoice_id TEXT REFERENCES invoices(id),
  order_type TEXT NOT NULL DEFAULT 'take_away',
  channel TEXT NOT NULL DEFAULT 'pos',
  status TEXT NOT NULL DEFAULT 'WFC',
  aggregator TEXT,
  aggregator_reference TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  delivery_address TEXT,
  delivery_latitude REAL,
  delivery_longitude REAL,
  table_number TEXT,
  driver_id TEXT REFERENCES delivery_drivers(id),
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_info TEXT,
  delivery_fee REAL NOT NULL DEFAULT 0,
  subtotal REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  items TEXT NOT NULL,
  note TEXT,
  estimated_time_minutes INTEGER NOT NULL DEFAULT 30,
  confirmed_at INTEGER,
  cooking_started_at INTEGER,
  ready_at INTEGER,
  dispatched_at INTEGER,
  delivered_at INTEGER,
  cancelled_at INTEGER,
  cancel_reason TEXT,
  cancelled_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
`);

// 3. order_status_logs table
db.exec(`
CREATE TABLE IF NOT EXISTS order_status_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  order_id TEXT NOT NULL REFERENCES delivery_orders(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT,
  actor_role TEXT NOT NULL DEFAULT 'cashier',
  note TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
`);

// Create indices
db.exec(`
CREATE INDEX IF NOT EXISTS idx_delivery_orders_tenant_status ON delivery_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_created_at ON delivery_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_status_logs_order_id ON order_status_logs(order_id);
`);

console.log('MIGRATION_SUCCESS');
db.close();
