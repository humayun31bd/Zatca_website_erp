const db = require('better-sqlite3')('sqlite.db');
const indexes = db.prepare(`SELECT name FROM sqlite_master WHERE type='index'`).all();
let dropped = 0;
for(const idx of indexes) {
  if (!idx.name.startsWith('sqlite_autoindex')) {
    try {
      db.exec(`DROP INDEX "${idx.name}"`);
      console.log('Dropped ' + idx.name);
      dropped++;
    } catch(e) {
      console.error('Failed to drop ' + idx.name + ': ' + e.message);
    }
  }
}
console.log('Total dropped: ' + dropped);
