const Database = require('better-sqlite3')
const { join } = require('path')
const { existsSync } = require('fs')

const dbPath = join(process.cwd(), 'data', 'erp.db')

if (!existsSync(dbPath)) {
  console.error('Veritabanı dosyası bulunamadı:', dbPath)
  process.exit(1)
}

const db = new Database(dbPath)

console.log('Veriler siliniyor...\n')

try {
  // Siparişleri sil (önce ilişkili tabloları temizle)
  console.log('1. Sipariş kartları siliniyor (notes içinde "Sipariş:" geçenler)...')
  const deletedCards = db.prepare("DELETE FROM product_serial_numbers WHERE notes LIKE '%Sipariş:%'").run()
  console.log(`   ✓ ${deletedCards.changes || 0} kart silindi`)

  console.log('2. Siparişler siliniyor...')
  const deletedOrders = db.prepare('DELETE FROM orders').run()
  console.log(`   ✓ ${deletedOrders.changes || 0} sipariş silindi`)

  // Cari hesapları sil
  console.log('3. Cari hesaplar siliniyor...')
  const deletedAccounts = db.prepare('DELETE FROM accounts').run()
  console.log(`   ✓ ${deletedAccounts.changes || 0} cari hesap silindi`)

  // Hammadde verilerini sil
  console.log('4. Hammadde stokları siliniyor...')
  const deletedMaterialStocks = db.prepare('DELETE FROM material_stocks').run()
  console.log(`   ✓ ${deletedMaterialStocks.changes || 0} hammadde stok kaydı silindi`)

  console.log('5. Hammaddeler siliniyor...')
  const deletedMaterials = db.prepare('DELETE FROM materials').run()
  console.log(`   ✓ ${deletedMaterials.changes || 0} hammadde silindi`)

  console.log('\n✅ Tüm veriler başarıyla silindi!')
} catch (error) {
  console.error('\n❌ Hata:', error.message)
  process.exit(1)
} finally {
  db.close()
}
