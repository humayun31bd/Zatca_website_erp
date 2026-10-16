const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

db.exec(`
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  transfer_number TEXT NOT NULL UNIQUE,
  from_warehouse_id TEXT NOT NULL,
  from_warehouse_name TEXT,
  to_warehouse_id TEXT NOT NULL,
  to_warehouse_name TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  transfer_date TEXT NOT NULL,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_transfer_items (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  FOREIGN KEY (transfer_id) REFERENCES inventory_transfers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  adjustment_number TEXT NOT NULL UNIQUE,
  warehouse_id TEXT NOT NULL,
  warehouse_name TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'APPROVED',
  adjusted_by TEXT,
  adjustment_date TEXT NOT NULL,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_adjustment_items (
  id TEXT PRIMARY KEY,
  adjustment_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  adjustment_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  FOREIGN KEY (adjustment_id) REFERENCES inventory_adjustments(id) ON DELETE CASCADE
);
`);

console.log('Transfers and Adjustments tables created/verified successfully.');
