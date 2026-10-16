const db = require('better-sqlite3')('sqlite.db');
const indexes = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_autoindex%'`).all();
console.log('Found ' + indexes.length + ' indexes to drop');
for (const idx of indexes) {
  try {
    console.log(`Dropping index ${idx.name}`);
    db.exec(`DROP INDEX "${idx.name}"`);
  } catch(e) {
    console.error(`Failed to drop ${idx.name}: ${e.message}`);
  }
}
