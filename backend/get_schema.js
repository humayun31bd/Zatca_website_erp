const db = require('better-sqlite3')('sqlite.db');
const fs = require('fs');
const schema = db.prepare(`SELECT name, sql FROM sqlite_master WHERE type='table'`).all();
fs.writeFileSync('schema_dump2.txt', schema.map(t => t.sql).join('\n'));
