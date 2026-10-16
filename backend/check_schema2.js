const db = require('better-sqlite3')('sqlite.db');
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
for (let t of tables) {
  if (t.sql && t.sql.toLowerCase().includes('country')) {
    console.log(`Table ${t.name} has country in schema:\n${t.sql}`);
  }
}
