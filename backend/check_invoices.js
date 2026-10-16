const db = require('better-sqlite3')('sqlite.db');
const items = db.prepare("SELECT type, name, sql FROM sqlite_master WHERE name LIKE '%invoice%'").all();
console.log(items);
