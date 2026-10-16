const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

db.exec(`
CREATE TABLE IF NOT EXISTS goods_received_notes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  grn_number TEXT NOT NULL UNIQUE,
  po_id TEXT,
  po_number TEXT,
  supplier_id TEXT NOT NULL,
  warehouse_id TEXT,
  received_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  delivery_note_number TEXT,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grn_items (
  id TEXT PRIMARY KEY,
  grn_id TEXT NOT NULL,
  product_id TEXT,
  description TEXT NOT NULL,
  ordered_quantity REAL NOT NULL,
  received_quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  FOREIGN KEY (grn_id) REFERENCES goods_received_notes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quality_check_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  qc_number TEXT NOT NULL UNIQUE,
  grn_id TEXT NOT NULL,
  grn_number TEXT,
  inspector_name TEXT,
  check_date TEXT NOT NULL,
  overall_status TEXT NOT NULL DEFAULT 'PASSED',
  total_received REAL NOT NULL DEFAULT 0,
  total_accepted REAL NOT NULL DEFAULT 0,
  total_rejected REAL NOT NULL DEFAULT 0,
  total_exchanged REAL NOT NULL DEFAULT 0,
  remarks TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qc_items (
  id TEXT PRIMARY KEY,
  qc_id TEXT NOT NULL,
  description TEXT NOT NULL,
  received_quantity REAL NOT NULL,
  accepted_quantity REAL NOT NULL,
  rejected_quantity REAL NOT NULL,
  exchanged_quantity REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'PASSED',
  defect_reason TEXT,
  FOREIGN KEY (qc_id) REFERENCES quality_check_records(id) ON DELETE CASCADE
);
`);

console.log('GRN and QC tables created/verified successfully.');
