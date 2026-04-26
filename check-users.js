const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'data', 'erp.db');
console.log('Checking DB at:', dbPath);
const db = new Database(dbPath);
try {
  const users = db.prepare('SELECT id, username, role, is_approved FROM users LIMIT 10').all();
  console.log(JSON.stringify(users, null, 2));
} catch (e) {
  console.error(e.message);
} finally {
  db.close();
}
