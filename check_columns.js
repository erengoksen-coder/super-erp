const Database = require('better-sqlite3');
const db = new Database('data/erp.db');
const columns = db.prepare("PRAGMA table_info(service_tickets)").all();
console.log(JSON.stringify(columns, null, 2));
db.close();
