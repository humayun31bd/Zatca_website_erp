const db = require('better-sqlite3')('sqlite.db');
const indexes = db.prepare(`SELECT name, sql FROM sqlite_master WHERE type='index'`).all();
console.log(indexes);
