#!/usr/bin/env node
/**
 * Tamamlanmış ("Bitti") üretim emirlerini ve barkod kayıtlarını siler.
 * Usta Terminali'ndeki Bitti kartları temizlenir.
 *
 * Sadece PRD-373231: node scripts/delete-completed-order-prd373231.js
 * Tüm tamamlanmış emirler: node scripts/delete-completed-order-prd373231.js --all
 */

const { assertDbExists, openDatabase } = require('./db-utils')

const dbPath = assertDbExists()
const db = openDatabase()
const deleteAll = process.argv.includes('--all')
const TARGET_SKU = 'PRD-373231'

console.log('========================================')
console.log('  Tamamlanmış üretim emirleri siliniyor')
if (deleteAll) {
  console.log('  Kapsam: TÜM tamamlanmış emirler')
} else {
  console.log('  Ürün:', TARGET_SKU, '(ATLAS ÜÇLÜ)')
}
console.log('========================================\n')

let orders = []
if (deleteAll) {
  orders = db.prepare(`
    SELECT id, order_number, product_id, quantity, status
    FROM production_orders
    WHERE status = 'completed' AND deleted_at IS NULL
  `).all()
} else {
  let productId = null
  try {
    const row = db.prepare('SELECT id FROM products WHERE sku = ?').get(TARGET_SKU)
    if (row) productId = row.id
  } catch {}
  if (!productId) {
    try {
      const row = db.prepare('SELECT id FROM active_products WHERE sku = ?').get(TARGET_SKU)
      if (row) productId = row.id
    } catch {}
  }
  if (!productId) {
    console.log('Ürün bulunamadı (SKU:', TARGET_SKU + '). Çıkılıyor.')
    db.close()
    process.exit(1)
  }
  orders = db.prepare(`
    SELECT id, order_number, product_id, quantity, status
    FROM production_orders
    WHERE product_id = ? AND status = 'completed' AND deleted_at IS NULL
  `).all(productId)
}

if (orders.length === 0) {
  console.log('Silinecek tamamlanmış üretim emri yok.')
  db.close()
  process.exit(0)
}

console.log('Bulunan tamamlanmış emir sayısı:', orders.length)
orders.forEach(o => console.log('  -', o.order_number, '| adet:', o.quantity, '|', o.id))

const orderIds = orders.map(o => o.id)

db.transaction(() => {
  // 1) Barkod/kart kayıtları
  const placeholders = orderIds.map(() => '?').join(',')
  const delBarcodes = db.prepare(`DELETE FROM product_serial_numbers WHERE production_order_id IN (${placeholders})`).run(...orderIds)
  console.log('\nSilinen product_serial_numbers (barkod/kart):', delBarcodes.changes)

  // 2) Fiili harcama kayıtları
  try {
    const delConsumption = db.prepare(`DELETE FROM production_actual_consumption WHERE production_order_id IN (${placeholders})`).run(...orderIds)
    if (delConsumption.changes > 0) console.log('Silinen production_actual_consumption:', delConsumption.changes)
  } catch (e) {
    // tablo yoksa atla
  }

  // 3) Üretim maliyet kayıtları
  try {
    const delCosts = db.prepare(`DELETE FROM production_costs WHERE production_order_id IN (${placeholders})`).run(...orderIds)
    if (delCosts.changes > 0) console.log('Silinen production_costs:', delCosts.changes)
  } catch (e) {}

  // 4) Üretim emirleri
  const delOrders = db.prepare(`DELETE FROM production_orders WHERE id IN (${placeholders})`).run(...orderIds)
  console.log('Silinen production_orders:', delOrders.changes)
})()

db.close()
console.log('\nBitti. Usta Terminali sayfasını yenileyin.')
process.exit(0)
