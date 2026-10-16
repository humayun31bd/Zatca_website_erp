const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'sqlite.db');
const db = new Database(dbPath);

console.log('Migrating cs_items columns in sqlite.db...');

const columns = [
  { name: 'financial_score', def: 'REAL DEFAULT 0' },
  { name: 'delivery_score', def: 'REAL DEFAULT 0' },
  { name: 'technical_score', def: 'REAL DEFAULT 80' },
  { name: 'composite_score', def: 'REAL DEFAULT 0' },
  { name: 'delivery_lead_days', def: 'INTEGER DEFAULT 7' },
  { name: 'rank', def: 'INTEGER DEFAULT 1' },
  { name: 'is_lowest_price', def: 'INTEGER DEFAULT 0' },
  { name: 'is_highest_score', def: 'INTEGER DEFAULT 0' },
];

for (const col of columns) {
  try {
    db.exec(`ALTER TABLE cs_items ADD COLUMN ${col.name} ${col.def};`);
    console.log(`✓ Added column ${col.name}`);
  } catch (err) {
    if (err.message.includes('duplicate column name')) {
      console.log(`Column ${col.name} already exists.`);
    } else {
      console.error(`Error adding ${col.name}:`, err.message);
    }
  }
}

console.log('Migration completed successfully!');
db.close();
