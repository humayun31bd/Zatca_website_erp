const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'sqlite.db');
const db = new Database(dbPath);

console.log("Migrating suppliers table for Classification, Tiering & Credit Terms...");

try {
  const tableInfo = db.pragma('table_info(suppliers)');
  const columnNames = tableInfo.map(c => c.name);

  if (!columnNames.includes('category')) {
    db.exec(`ALTER TABLE suppliers ADD COLUMN category TEXT DEFAULT 'MERCHANDISE';`);
    console.log("  [+] Added column 'category'");
  }

  if (!columnNames.includes('supplier_tier')) {
    db.exec(`ALTER TABLE suppliers ADD COLUMN supplier_tier TEXT DEFAULT 'TIER_2_STANDARD';`);
    console.log("  [+] Added column 'supplier_tier'");
  }

  if (!columnNames.includes('payment_terms')) {
    db.exec(`ALTER TABLE suppliers ADD COLUMN payment_terms TEXT DEFAULT 'NET_30';`);
    console.log("  [+] Added column 'payment_terms'");
  }

  console.log("✅ Migration completed successfully!");
} catch (err) {
  console.error("Migration error:", err);
} finally {
  db.close();
}
