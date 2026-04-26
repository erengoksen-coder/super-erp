const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(process.cwd(), 'data', 'erp.db');
const db = new Database(dbPath);

try {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, 'admin');
  console.log('Admin password reset to: admin123 (bcrypt)');
} catch (e) {
  console.error(e.message);
} finally {
  db.close();
}
