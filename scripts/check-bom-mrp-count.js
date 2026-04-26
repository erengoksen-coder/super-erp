#!/usr/bin/env node
/**
 * BOM ve MRP ürün sayılarını test eder (aynı mantık: aktif reçetesi olan ürünler).
 * Çalıştırma: node scripts/check-bom-mrp-count.js
 */

const { assertDbExists, openDatabase } = require('./db-utils')

const dbPath = assertDbExists()
const db = openDatabase()

console.log('========================================')
console.log('  BOM vs MRP ürün sayısı kontrolü')
console.log('========================================\n')

// 1) BOM sayfasındaki liste (GET /api/bom - ürün bazlı gruplu)
let bomProducts = []
try {
  const bomRows = db.prepare(`
    SELECT DISTINCT b.product_id, p.sku, p.name
    FROM bom b
    JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
    JOIN products p ON b.product_id = p.id
    WHERE b.deleted_at IS NULL
    ORDER BY p.sku
  `).all()
  bomProducts = bomRows
} catch (e) {
  try {
    bomProducts = db.prepare(`
      SELECT DISTINCT b.product_id, p.sku, p.name
      FROM bom b
      JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
      JOIN active_products p ON b.product_id = p.id
      WHERE b.deleted_at IS NULL
      ORDER BY p.sku
    `).all()
  } catch (e2) {
    console.error('BOM sorgusu hatası:', e2.message)
  }
}

console.log('BOM (aktif reçetesi olan ürünler):')
console.log('  Adet:', bomProducts.length)
if (bomProducts.length > 0) {
  bomProducts.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.sku} - ${r.name || '(isim yok)'}`)
  })
}
console.log('')

// 2) MRP'de listelenen ürünler (GET /api/products?has_bom=1 ile aynı)
let allProducts = []
try {
  allProducts = db.prepare('SELECT id, sku, name FROM active_products WHERE deleted_at IS NULL ORDER BY sku').all()
} catch {
  allProducts = db.prepare('SELECT id, sku, name FROM products WHERE deleted_at IS NULL ORDER BY sku').all()
}

let productIdsWithBom = []
try {
  productIdsWithBom = db.prepare(`
    SELECT DISTINCT b.product_id
    FROM bom b
    JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
    WHERE b.deleted_at IS NULL
  `).all()
} catch {
  productIdsWithBom = db.prepare('SELECT DISTINCT product_id FROM bom WHERE deleted_at IS NULL').all()
}

const idSet = new Set(productIdsWithBom.map(r => r.product_id))
const mrpProducts = allProducts.filter(p => idSet.has(p.id))

console.log('MRP (has_bom=1 ile dönen ürünler):')
console.log('  Adet:', mrpProducts.length)
if (mrpProducts.length > 0) {
  mrpProducts.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.sku} - ${r.name || '(isim yok)'}`)
  })
}
console.log('')

// 3) Karşılaştır
const bomIds = new Set(bomProducts.map(r => r.product_id))
const mrpIds = new Set(mrpProducts.map(r => r.id))
const onlyInBom = bomProducts.filter(r => !mrpIds.has(r.product_id))
const onlyInMrp = mrpProducts.filter(r => !bomIds.has(r.id))

if (bomProducts.length === mrpProducts.length && onlyInBom.length === 0 && onlyInMrp.length === 0) {
  console.log('Sonuç: BOM ve MRP listesi aynı (' + bomProducts.length + ' ürün).')
} else {
  if (onlyInBom.length) {
    console.log('Sadece BOM\'da görünen (MRP\'de yok):', onlyInBom.map(r => r.sku).join(', '))
  }
  if (onlyInMrp.length) {
    console.log('Sadece MRP\'de görünen (BOM\'da yok):', onlyInMrp.map(r => r.sku).join(', '))
  }
  console.log('Sonuç: Liste farkı var. BOM adet:', bomProducts.length, ', MRP adet:', mrpProducts.length)
}

db.close()
console.log('\nBitti.')
process.exit(0)
