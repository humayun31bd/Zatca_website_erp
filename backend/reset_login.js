const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

async function resetLogin() {
  console.log("=== RESETTING LOGIN & ACCOUNTS ===");
  const newPassword = 'password123';
  const hash = await bcrypt.hash(newPassword, 10);

  // 1. Clear any lockout or failed attempt records
  try {
    const delAttempts = db.prepare('DELETE FROM login_attempts').run();
    console.log(`Cleared ${delAttempts.changes} login attempt lockout records.`);
  } catch (err) {
    console.log('No login_attempts table or already empty.');
  }

  // 2. Reset password for all existing users to password123
  try {
    const updateUsers = db.prepare('UPDATE users SET password_hash = ?').run(hash);
    console.log(`Updated passwords for ${updateUsers.changes} existing users to: ${newPassword}`);
  } catch (err) {
    console.error('Error updating users:', err);
  }

  // 3. Ensure standard superadmin admin@example.com exists
  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@example.com');
    if (!existing) {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, role, created_at)
        VALUES (?, ?, ?, 'SUPERADMIN', strftime('%s', 'now'))
      `).run('00000000-0000-0000-0000-000000000000', 'admin@example.com', hash);
      console.log('Created standard superadmin: admin@example.com with password: ' + newPassword);
    } else {
      db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, 'admin@example.com');
      console.log('Reset admin@example.com password to: ' + newPassword);
    }
  } catch (err) {
    console.error('Error ensuring admin@example.com:', err);
  }

  // 4. Print all available login accounts
  const users = db.prepare('SELECT id, email, role, tenant_id FROM users').all();
  console.log('\n--- ACTIVE LOGIN CREDENTIALS ---');
  users.forEach((u) => {
    console.log(`• Email: ${u.email} | Role: ${u.role} | Password: ${newPassword}`);
  });
  console.log('--------------------------------\n');
}

resetLogin().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
