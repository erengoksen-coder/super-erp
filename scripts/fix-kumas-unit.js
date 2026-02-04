#!/usr/bin/env node

const Database = require('better-sqlite3')

const db = new Database('data/erp.db')
try {
  const sql = "UPDATE materials SET unit='metre' WHERE LOWER(category) LIKE 'kuma%' OR name LIKE 'Kuma%'"
  const res = db.prepare(sql).run()
  console.log('Updated rows:', res.changes)
} finally {
  db.close()
}
