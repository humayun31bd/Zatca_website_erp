const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'sqlite.db');
const db = new Database(dbPath);

console.log("Initializing Quotations & CS tables in sqlite.db...");

db.exec(`
  CREATE TABLE IF NOT EXISTS supplier_quotations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    quotation_number TEXT NOT NULL,
    issue_date INTEGER NOT NULL,
    valid_until INTEGER,
    subtotal_amount REAL NOT NULL,
    total_vat_amount REAL NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'SUBMITTED' NOT NULL,
    remarks TEXT,
    created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS supplier_quotation_items (
    id TEXT PRIMARY KEY,
    quotation_id TEXT NOT NULL REFERENCES supplier_quotations(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    vat_rate REAL DEFAULT 15 NOT NULL,
    subtotal_amount REAL NOT NULL,
    vat_amount REAL NOT NULL,
    total_amount REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quotation_comparative_statements (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cs_number TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' NOT NULL,
    winning_quotation_id TEXT REFERENCES supplier_quotations(id),
    remarks TEXT,
    created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cs_items (
    id TEXT PRIMARY KEY,
    cs_id TEXT NOT NULL REFERENCES quotation_comparative_statements(id) ON DELETE CASCADE,
    quotation_id TEXT NOT NULL REFERENCES supplier_quotations(id),
    is_winning_bid INTEGER DEFAULT 0 NOT NULL,
    score REAL DEFAULT 0
  );
`);

console.log("Quotations and Comparative Statements (CS) tables created successfully!");
db.close();
