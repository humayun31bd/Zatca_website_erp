const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'sqlite.db');
const db = new Database(dbPath);

try {
  db.exec("ALTER TABLE tenant_settings ADD COLUMN purchase_flow_type TEXT DEFAULT 'NORMAL' NOT NULL;");
  console.log("Successfully added 'purchase_flow_type' column to 'tenant_settings'.");
} catch (e) {
  console.log("Column 'purchase_flow_type' note:", e.message);
}

const settings = db.prepare("SELECT * FROM tenant_settings").all();
console.log("Current Tenant Settings:", settings);
db.close();
