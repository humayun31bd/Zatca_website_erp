const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

db.exec(`
CREATE TABLE IF NOT EXISTS supplier_bills (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  bill_number TEXT NOT NULL UNIQUE,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT,
  po_id TEXT,
  grn_id TEXT,
  issue_date TEXT NOT NULL,
  due_date TEXT,
  subtotal_amount REAL NOT NULL DEFAULT 0,
  vat_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'UNPAID',
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

console.log('Supplier Bills table created/verified successfully.');
