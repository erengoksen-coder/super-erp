#!/usr/bin/env node
/**
 * Eski çek/senet hareketlerini düzeltir:
 * - Alındığı cari (bize çek veren) → credit + "Çek/Senet alındı" (Alacaklı, yeşil)
 * - Verildiği cari (biz çek verdik) → debit + "Çek/Senet verildi" (Borçlu, kırmızı)
 * Mevcut ters kayıtları (debit/credit) ve açıklamaları günceller, bakiyeleri yeniden hesaplar.
 */
const { openDatabase, assertDbExists } = require('./db-utils')

const CHECK_NOTE_REFERENCE_TYPE = 'check_note'

function recalcAccountBalance(db, accountId) {
  const row = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) AS balance
    FROM account_transactions WHERE account_id = ?
  `).get(accountId)
  const balance = row?.balance ?? 0
  db.prepare('UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(balance, accountId)
}

function main() {
  assertDbExists()
  const db = openDatabase()

  const checks = db.prepare(`
    SELECT id, account_id, given_to_account_id, amount
    FROM checks_and_notes
    WHERE deleted_at IS NULL AND status = 'given' AND direction = 'received'
  `).all()

  let updated = 0
  const affectedAccountIds = new Set()

  for (const check of checks) {
    const txns = db.prepare(`
      SELECT id, account_id, transaction_type, description
      FROM account_transactions
      WHERE reference_type = ? AND reference_id = ?
    `).all(CHECK_NOTE_REFERENCE_TYPE, check.id)

    for (const tx of txns) {
      let newType = null
      let newDesc = null
      if (tx.account_id === check.account_id) {
        if (tx.transaction_type === 'debit') {
          newType = 'credit'
          newDesc = 'Çek/Senet alındı'
        }
      } else if (check.given_to_account_id && tx.account_id === check.given_to_account_id) {
        if (tx.transaction_type === 'credit') {
          newType = 'debit'
          newDesc = 'Çek/Senet verildi'
        }
      }
      if (newType) {
        db.prepare(`
          UPDATE account_transactions SET transaction_type = ?, description = ? WHERE id = ?
        `).run(newType, newDesc || tx.description, tx.id)
        updated++
        affectedAccountIds.add(tx.account_id)
      }
    }
  }

  for (const aid of affectedAccountIds) {
    recalcAccountBalance(db, aid)
  }

  console.log(`${checks.length} çek/senet kaydı tarandı, ${updated} hareket düzeltildi, ${affectedAccountIds.size} cari bakiyesi güncellendi.`)
  db.close()
}

main()
