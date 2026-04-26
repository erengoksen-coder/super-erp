#!/usr/bin/env node
/**
 * BOM'da sadece ekranda görünen (aktif reçetesi kalacak) ürünleri bırakır.
 * Diğer tüm ürünlerin BOM versiyonlarını pasif (is_active=0) yapar.
 * Varsayılan: Sadece PRD-100146 ve PRD-127652 aktif kalsın.
 *
 * Çalıştırma: node scripts/bom-keep-only-visible.js
 *             node scripts/bom-keep-only-visible.js --dry-run  (sadece rapor, değişiklik yapma)
 */

const { assertDbExists, openDatabase } = require('./db-utils')

const dryRun = process.argv.includes('--dry-run')

// BOM sayfasında görünmesini istediğiniz ürünler (SKU). Bunların dışındakiler pasifleştirilir.
const KEEP_SKUS = ['PRD-100146', 'PRD-127652']

const dbPath = assertDbExists()
const db = openDatabase()

console.log('========================================')
console.log('  BOM: Sadece görünen ürünler aktif kalsın')
console.log('========================================\n')
console.log('Aktif kalacak ürünler (SKU):', KEEP_SKUS.join(', '))
if (dryRun) console.log('(--dry-run: değişiklik yapılmayacak)\n')

// Ürün id'lerini SKU'dan bul
let keepProductIds = []
try {
  const products = db.prepare(`
    SELECT id, sku FROM products WHERE sku IN (${KEEP_SKUS.map(() => '?').join(',')})
  `).all(...KEEP_SKUS)
  keepProductIds = products.map(p => p.id)
  console.log('Bu ürünlerin id\'leri:', keepProductIds.join(', ') || '(bulunamadı)')
} catch (e) {
  try {
    const products = db.prepare(`
      SELECT id, sku FROM active_products WHERE sku IN (${KEEP_SKUS.map(() => '?').join(',')})
    `).all(...KEEP_SKUS)
    keepProductIds = products.map(p => p.id)
  } catch (e2) {
    console.error('Ürün sorgusu hatası:', e2.message)
    process.exit(1)
  }
}

if (keepProductIds.length === 0) {
  console.log('Uyarı: Kalacak ürün bulunamadı. Tüm aktif BOM pasifleştirilir.')
}

// Şu an aktif BOM'u olan ürünler
let activeNow = []
try {
  activeNow = db.prepare(`
    SELECT DISTINCT bv.product_id, p.sku, p.name
    FROM bom_versions bv
    JOIN products p ON p.id = bv.product_id
    WHERE bv.is_active = 1 AND bv.deleted_at IS NULL
    ORDER BY p.sku
  `).all()
} catch {
  activeNow = db.prepare(`
    SELECT DISTINCT bv.product_id, p.sku, p.name
    FROM bom_versions bv
    JOIN active_products p ON p.id = bv.product_id
    WHERE bv.is_active = 1 AND bv.deleted_at IS NULL
    ORDER BY p.sku
  `).all()
}

console.log('\nŞu an aktif BOM\'u olan ürün sayısı:', activeNow.length)
activeNow.forEach(r => console.log('  -', r.sku, r.name || ''))

const toDeactivate = activeNow.filter(r => !keepProductIds.includes(r.product_id))
if (toDeactivate.length === 0) {
  console.log('\nPasifleştirilecek ürün yok. Zaten sadece istenen ürünler aktif.')
  db.close()
  process.exit(0)
}

console.log('\nPasifleştirilecek (aktif reçete kapatılacak) ürünler:', toDeactivate.length)
toDeactivate.forEach(r => console.log('  -', r.sku, r.name || ''))

if (!dryRun) {
  const placeholders = toDeactivate.map(() => '?').join(',')
  const ids = toDeactivate.map(r => r.product_id)
  const result = db.prepare(`
    UPDATE bom_versions SET is_active = 0, updated_at = CURRENT_TIMESTAMP
    WHERE product_id IN (${placeholders}) AND deleted_at IS NULL
  `).run(...ids)
  console.log('\nGüncellendi: bom_versions.is_active = 0 yapılan satır:', result.changes)
} else {
  console.log('\n[--dry-run] Güncelleme atlandı.')
}

db.close()
console.log('\nBitti. BOM ve MRP artık sadece', KEEP_SKUS.length, 'ürün gösterecek.')
process.exit(0)
