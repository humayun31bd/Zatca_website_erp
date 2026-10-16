const fs = require('fs');
const db = require('better-sqlite3')('sqlite.db');

const sql = fs.readFileSync('drizzle/0000_even_lily_hollister.sql', 'utf8');
const statements = sql.split('--> statement-breakpoint');

let success = 0;
let failed = 0;

for (let stmt of statements) {
  stmt = stmt.trim();
  if (stmt.startsWith('CREATE UNIQUE INDEX') || stmt.startsWith('CREATE INDEX')) {
    try {
      db.exec(stmt);
      console.log('Created index: ' + stmt.substring(0, 50) + '...');
      success++;
    } catch (e) {
      if (e.message.includes('already exists')) {
        // ignore
      } else {
        console.error('Error creating index: ' + e.message);
        failed++;
      }
    }
  }
}

console.log(`Successfully created ${success} indexes. Failed: ${failed}.`);
