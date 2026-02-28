
const Database = require('better-sqlite3');
const db = new Database('c:\\super-erp\\data\\erp.db');

try {
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tableCheck.map(t => t.name));

  const DEFAULT_COMPANY_ID = 'company_default';

  const rows = db.prepare(`
          SELECT
            a.id as account_id,
            a.name as customer_name,
            a.type as account_type,
            a.deleted_at,
            a.company_id
          FROM accounts a
          WHERE a.deleted_at IS NULL
            AND a.company_id = ?
          LIMIT 10
    `).all(DEFAULT_COMPANY_ID);

  console.log('Simple query result count:', rows.length);
  console.log('Sample rows:', rows);

} catch (err) {
  console.error('ERROR:', err.message);
}
