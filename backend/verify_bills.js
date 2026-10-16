const Database = require('better-sqlite3');
const db = new Database(process.env.SQLITE_DB_PATH || 'sqlite.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_bills (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    bill_number TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    supplier_name TEXT,
    po_id TEXT,
    grn_id TEXT,
    issue_date TEXT NOT NULL,
    due_date TEXT,
    subtotal_amount REAL DEFAULT 0 NOT NULL,
    discount_amount REAL DEFAULT 0 NOT NULL,
    vat_amount REAL DEFAULT 0 NOT NULL,
    total_amount REAL DEFAULT 0 NOT NULL,
    paid_amount REAL DEFAULT 0 NOT NULL,
    payment_status TEXT DEFAULT 'UNPAID' NOT NULL,
    reference_doc_url TEXT,
    reference_doc_name TEXT,
    remarks TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  );
`);

try { db.exec('ALTER TABLE supplier_bills ADD COLUMN discount_amount REAL DEFAULT 0;'); } catch (e) {}
try { db.exec('ALTER TABLE supplier_bills ADD COLUMN reference_doc_url TEXT;'); } catch (e) {}
try { db.exec('ALTER TABLE supplier_bills ADD COLUMN reference_doc_name TEXT;'); } catch (e) {}

const cols = db.prepare('PRAGMA table_info(supplier_bills)').all().map(c => c.name);
console.log('Verified columns in supplier_bills:', cols);
