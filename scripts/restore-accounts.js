#!/usr/bin/env node
/**
 * Silinmiş (soft-delete) cari hesapları geri getirir: deleted_at = NULL yapar.
 * "Cari hesap bulunamadı veya silinmiş olabilir" hatası listedeki cariler için
 * tekrar ediyorsa, bu script ile DB'deki silinmiş kayıtları geri alabilirsiniz.
 *
 * Kullanım: node scripts/restore-accounts.js
 */
const { openDatabase, assertDbExists } = require('./db-utils')

function main() {
  assertDbExists()
  const db = openDatabase()

  const before = db.prepare('SELECT COUNT(*) as n FROM accounts WHERE deleted_at IS NOT NULL').get()
  const count = before?.n ?? 0

  if (count === 0) {
    console.log('Silinmis cari yok. Hepsi zaten gorunur durumda.')
    db.close()
    process.exit(0)
    return
  }

  db.prepare('UPDATE accounts SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE deleted_at IS NOT NULL').run()
  console.log(`${count} adet silinmis cari geri getirildi (deleted_at temizlendi).`)
  db.close()
}

main()
