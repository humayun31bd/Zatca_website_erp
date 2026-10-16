const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '..', 'sqlite.db');
console.log('Connecting to database at:', dbPath);

try {
  const db = new Database(dbPath);

  // Clear login attempts lock
  const deleted = db.prepare('DELETE FROM login_attempts').run();
  console.log(`Cleared ${deleted.changes} locked login attempt records.`);

  // Check users table
  const users = db.prepare('SELECT id, email, role, tenant_id FROM users').all();
  console.log('Registered Users:');
  console.table(users);

  // Reset admin@super-software.com password to password123
  const hash = bcrypt.hashSync('password123', 10);
  db.prepare(`UPDATE users SET password_hash = ? WHERE email = 'admin@super-software.com'`).run(hash);
  db.prepare(`UPDATE users SET password_hash = ? WHERE email = 'owner@demo-client.com'`).run(hash);

  console.log('\n✅ Successfully reset user passwords for testing:');
  console.log('1. Email: admin@super-software.com | Password: password123 (Role: SUPERADMIN)');
  console.log('2. Email: owner@demo-client.com    | Password: password123 (Role: TENANT_ADMIN)');

  db.close();
} catch (err) {
  console.error('Error resetting auth:', err);
}
