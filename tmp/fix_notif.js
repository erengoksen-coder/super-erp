const Database = require('better-sqlite3');
const db = new Database('./super-erp.db');
db.prepare("UPDATE notifications SET type='info' WHERE type IS NULL OR type=''").run();
console.log('OK');
