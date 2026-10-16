const db = require('better-sqlite3')('sqlite.db');
try {
  db.pragma('foreign_keys = ON');
  db.prepare("INSERT INTO counter_sessions (id, tenant_id, counter_id, user_id, status) VALUES ('test-session', '336eaf82-a524-4b0a-9326-7197b1e5459e', 'ac2902b7-86f4-466b-a08f-81018abc64ad', '26d12e34-44ff-442f-a6cd-e17ede8b77e7', 'OPEN')").run();
  console.log('Insert SUCCESS');
} catch (e) {
  console.error('Insert ERROR:', e.message);
}
