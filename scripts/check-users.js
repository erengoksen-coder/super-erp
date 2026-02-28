const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'erp.db');
const db = new Database(dbPath);

const users = db.prepare('SELECT id, username, role FROM users').all();
console.log("Users:", users);

const roles = db.prepare('SELECT * FROM roles').all();
console.log("Roles:", roles);
