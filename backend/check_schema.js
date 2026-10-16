const db = require('better-sqlite3')('sqlite.db');
const tableSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='clients'").get();
console.log(tableSchema);
const tableSchema2 = db.prepare("SELECT sql FROM sqlite_master WHERE type='index'").all();
console.log(tableSchema2);
