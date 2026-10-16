const db = require('better-sqlite3')('sqlite.db');
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
let total = 0;
for(const t of tables) {
  try {
    const c = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get().c;
    total += c;
    if (c > 0) console.log(t.name, c);
  } catch(e) {}
}
console.log('Total rows:', total);
