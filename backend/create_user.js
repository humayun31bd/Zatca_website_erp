const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

async function createUser() {
    const email = 'admin@example.com';
    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 10);
    
    const stmt = db.prepare('INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)');
    try {
        stmt.run('00000000-0000-0000-0000-000000000000', email, passwordHash, 'SUPERADMIN', new Date().toISOString());
        console.log(`Created user: ${email} with password: ${password}`);
    } catch(e) {
        console.error("Error creating user:", e);
    }
}
createUser();
