#!/usr/bin/env node
/**
 * Tüm cari hesapların bakiyesini account_transactions tablosundan yeniden hesaplar.
 * Cari listesinde bakiye 0 görünüp aslında borç/alacak varsa bu script ile düzelir.
 */
const { openDatabase, assertDbExists } = require('./db-utils')

function main() {
  assertDbExists()
  const db = openDatabase()

  const accounts = db.prepare('SELECT id, code, name FROM accounts WHERE deleted_at IS NULL').all()
  let updated = 0
  for (const acc of accounts) {
    const row = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) -
             COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) AS balance
      FROM account_transactions WHERE account_id = ?
    `).get(acc.id)
    const balance = row?.balance ?? 0
    db.prepare('UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(balance, acc.id)
    updated++
  }
  console.log(`${updated} cari bakiyesi güncellendi.`)
  db.close()
}

main()
