const Database = require('better-sqlite3');
const db = new Database('data/erp.db');
const info = db.prepare("PRAGMA table_info(audit_logs)").all();
console.log(JSON.stringify(info, null, 2));
db.close();
