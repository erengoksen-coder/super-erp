
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'erp.db');
const db = new Database(dbPath);

const fs = require('fs');
const results = {};

const user = db.prepare("SELECT id, username, dealer_name, full_name, role FROM users WHERE dealer_name LIKE '%EREN%' OR full_name LIKE '%EREN%' OR username LIKE '%EREN%'").all();
results.users = user;

const orders = db.prepare("SELECT id, order_number, dealer_name, customer_name, customer_id, created_at FROM orders WHERE dealer_name LIKE '%EREN%' OR customer_name LIKE '%EREN%' ORDER BY created_at DESC LIMIT 50").all();
results.orders = orders;

fs.writeFileSync(path.join(process.cwd(), 'tmp', 'db_check_results.json'), JSON.stringify(results, null, 2));
console.log('Results written to tmp/db_check_results.json');

db.close();
