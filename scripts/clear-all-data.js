const Database = require('better-sqlite3')
const { join } = require('path')
const { existsSync } = require('fs')

const dbPath = join(process.cwd(), 'data', 'erp.db')

if (!existsSync(dbPath)) {
  console.log('Veritabanı dosyası bulunamadı:', dbPath)
  process.exit(0)
}

const db = new Database(dbPath)
db.pragma('foreign_keys = OFF')

console.log('Tüm veriler siliniyor...\n')

// Tüm tabloları al
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all()

console.log('Bulunan tablolar:')
tables.forEach((t, i) => {
  console.log(`${i + 1}. ${t.name}`)
})
console.log('')

// Her tablodan verileri sil
let totalDeleted = 0
tables.forEach(table => {
  try {
    const deleteQuery = db.prepare(`DELETE FROM ${table.name}`)
    const result = deleteQuery.run()
    const deleted = result.changes || 0
    totalDeleted += deleted
    if (deleted > 0) {
      console.log(`✓ ${table.name}: ${deleted} kayıt silindi`)
    } else {
      console.log(`○ ${table.name}: Veri yok`)
    }
  } catch (error) {
    console.log(`✗ ${table.name}: Hata - ${error.message}`)
  }
})

// AUTO_INCREMENT değerlerini sıfırla (SQLite'da bu genelde gerekmez ama bazı tablolarda sequence varsa)
try {
  db.exec('DELETE FROM sqlite_sequence')
  console.log('\n✓ Sequence değerleri sıfırlandı')
} catch (error) {
  // sqlite_sequence tablosu yoksa hata verme
}

console.log(`\n✅ Toplam ${totalDeleted} kayıt silindi!`)
console.log('Tüm veriler temizlendi. Programı yeniden başlatabilirsiniz.')

db.close()
process.exit(0)

