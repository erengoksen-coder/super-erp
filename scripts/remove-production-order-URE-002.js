#!/usr/bin/env node
/**
 * Tek seferlik: URE-002 üretim emrini sistemden kaldırır.
 * - Siparişleri bekleyene alır (production_order_id = NULL, status = pending)
 * - Barkod/kart kayıtlarını siler
 * - Üretim maliyetleri, fiili harcama, iş emirleri vb. silinir
 * - Üretim emri kaydı silinir
 *
 * Kullanım: node scripts/remove-production-order-URE-002.js
 */

const { assertDbExists, openDatabase } = require('./db-utils')

const dbPath = assertDbExists()
console.log('DB PATH:', dbPath)

const db = openDatabase(dbPath)

const ORDER_NUMBER = 'URE-002'

const row = db.prepare(`
  SELECT id, order_number, product_id, quantity, status
  FROM production_orders
  WHERE order_number = ? AND (deleted_at IS NULL OR deleted_at = '')
`).get(ORDER_NUMBER)

if (!row) {
  console.log('Üretim emri bulunamadı:', ORDER_NUMBER)
  db.close()
  process.exit(1)
}

const id = row.id
console.log('========================================')
console.log('  Üretim emri kaldırılıyor:', ORDER_NUMBER)
console.log('  id:', id)
console.log('========================================\n')

db.transaction(() => {
  // 1) Siparişleri bu üretim emrinden ayır, bekleyene al
  const upOrders = db.prepare(`
    UPDATE orders SET production_order_id = NULL, status = 'pending', updated_at = CURRENT_TIMESTAMP
    WHERE production_order_id = ?
  `).run(id)
  console.log('Siparişler bekleyene alındı (orders güncellendi):', upOrders.changes)

  // 2) sales_order_items varsa production_order_id temizle
  try {
    const upSales = db.prepare(`
      UPDATE sales_order_items SET production_order_id = NULL WHERE production_order_id = ?
    `).run(id)
    if (upSales.changes > 0) console.log('sales_order_items güncellendi:', upSales.changes)
  } catch (e) {}

  // 3) Barkod / seri no kayıtları
  const delBarcodes = db.prepare('DELETE FROM product_serial_numbers WHERE production_order_id = ?').run(id)
  console.log('Silinen product_serial_numbers (barkod/kart):', delBarcodes.changes)

  // 4) Fiili harcama
  try {
    const delConsumption = db.prepare('DELETE FROM production_actual_consumption WHERE production_order_id = ?').run(id)
    if (delConsumption.changes > 0) console.log('Silinen production_actual_consumption:', delConsumption.changes)
  } catch (e) {}

  // 5) Üretim maliyetleri
  try {
    const delCosts = db.prepare('DELETE FROM production_costs WHERE production_order_id = ?').run(id)
    if (delCosts.changes > 0) console.log('Silinen production_costs:', delCosts.changes)
  } catch (e) {}

  // 6) Üretim emri operasyonları
  try {
    const delOps = db.prepare('DELETE FROM production_order_operations WHERE production_order_id = ?').run(id)
    if (delOps.changes > 0) console.log('Silinen production_order_operations:', delOps.changes)
  } catch (e) {}

  // 7) İş emirleri (work_orders) ve alt kayıtları
  const workOrders = db.prepare('SELECT id FROM work_orders WHERE production_order_id = ?').all(id)
  const workOrderIds = workOrders.map((w) => w.id)
  if (workOrderIds.length > 0) {
    const placeholders = workOrderIds.map(() => '?').join(',')
    try {
      db.prepare(`DELETE FROM work_order_operations WHERE work_order_id IN (${placeholders})`).run(...workOrderIds)
    } catch (e) {}
    db.prepare(`DELETE FROM work_orders WHERE production_order_id = ?`).run(id)
    console.log('Silinen work_orders:', workOrderIds.length)
  }

  // 8) Üretim emri kaydı
  db.prepare('DELETE FROM production_orders WHERE id = ?').run(id)
  console.log('Silinen production_orders: 1 (URE-002)')
})()

db.close()
console.log('\nBitti. URE-002 sistemden kaldırıldı. Üretim ve Siparişler sayfalarını yenileyin.')
process.exit(0)
