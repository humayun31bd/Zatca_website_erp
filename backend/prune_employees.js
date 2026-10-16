const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'sqlite.db');
const backupPath = path.join(__dirname, 'sqlite.db.bak');

console.log('1. Creating database backup to:', backupPath);
fs.copyFileSync(dbPath, backupPath);
console.log('Backup created successfully. File size:', fs.statSync(backupPath).size, 'bytes');

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('2. Inspecting current employee count...');
const initialCount = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
console.log(`Initial total employee count: ${initialCount}`);

if (initialCount <= 50) {
  console.log('Employee count is already 50 or fewer. No pruning needed.');
  process.exit(0);
}

// Get the 50 most recently created employee IDs
const keepIdsRows = db.prepare(`
  SELECT id FROM employees 
  ORDER BY created_at DESC, rowid DESC 
  LIMIT 50
`).all();

const keepIds = keepIdsRows.map(r => r.id);
console.log(`Retaining ${keepIds.length} most recently created employees.`);

// Prepare transaction
const pruneTransaction = db.transaction(() => {
  // Create a temporary table with the IDs to keep
  db.exec('CREATE TEMP TABLE keep_employees (id TEXT PRIMARY KEY)');
  const insertKeep = db.prepare('INSERT INTO keep_employees (id) VALUES (?)');
  for (const id of keepIds) {
    insertKeep.run(id);
  }

  // Delete cascade from child tables first if foreign keys are not automatically cascading
  const tables = ['attendance', 'leave_requests', 'overtime', 'payroll', 'loans'];
  for (const t of tables) {
    try {
      const res = db.prepare(`DELETE FROM ${t} WHERE employee_id NOT IN (SELECT id FROM keep_employees)`).run();
      console.log(`Deleted ${res.changes} records from ${t}`);
    } catch (err) {
      console.log(`Table ${t} note:`, err.message);
    }
  }

  // Delete employees not in keep_employees
  const delEmpRes = db.prepare('DELETE FROM employees WHERE id NOT IN (SELECT id FROM keep_employees)').run();
  console.log(`Deleted ${delEmpRes.changes} employees.`);

  db.exec('DROP TABLE keep_employees');
});

console.log('3. Executing deletion transaction...');
pruneTransaction();

console.log('4. Verifying post-deletion count...');
const remainingCount = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
console.log(`Remaining employee count: ${remainingCount}`);

console.log('5. Running VACUUM to reclaim space...');
db.exec('VACUUM');

const finalDbSize = fs.statSync(dbPath).size;
console.log(`Database vacuumed. Final DB size: ${(finalDbSize / 1024 / 1024).toFixed(2)} MB`);
console.log('DONE!');
