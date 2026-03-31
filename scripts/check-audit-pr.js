const Database = require('better-sqlite3')
const db = new Database('data/erp.db')
const rows = db.prepare(`
  SELECT table_name, record_id, action, user_id, created_at
  FROM audit_logs
  WHERE table_name = 'purchase_requests'
  ORDER BY created_at DESC
  LIMIT 3
`).all()
console.log(rows)
db.close()
