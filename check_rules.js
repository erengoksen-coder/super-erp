const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'data', 'erp.db');
const db = new Database(dbPath);

const rules = db.prepare("SELECT * FROM approval_rules").all();
console.log(JSON.stringify(rules, null, 2));
