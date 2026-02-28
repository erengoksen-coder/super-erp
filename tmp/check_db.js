
const { getDatabase, DEFAULT_COMPANY_ID } = require('c:\\super-erp\\lib\\database\\db');
const db = getDatabase();
console.log('--- DATABASE CHECK ---');
console.log('Default Company ID:', DEFAULT_COMPANY_ID);
console.log('Accounts count:', db.prepare('SELECT count(*) as c FROM accounts').get().c);
console.log('Accounts Sample:', db.prepare('SELECT id, name, type, company_id FROM accounts LIMIT 5').all());
console.log('Transactions count:', db.prepare('SELECT count(*) as c FROM account_transactions').get().c);
console.log('Shipments count:', db.prepare('SELECT count(*) as c FROM shipments').get().c);
console.log('Summary of accounts by company_id:', db.prepare('SELECT company_id, count(*) as c FROM accounts GROUP BY company_id').all());
console.log('--- END CHECK ---');
process.exit(0);
