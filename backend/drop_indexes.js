const db = require('better-sqlite3')('sqlite.db');
const items = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_autoindex%'").all();
for (let item of items) {
  try {
    db.exec(`DROP INDEX IF EXISTS \`${item.name}\``);
    console.log(`Dropped index ${item.name}`);
  } catch (e) {
    console.error(`Failed to drop index ${item.name}: ${e}`);
  }
}
