/**
 * Bir seferlik: Mamül depoda olan VE sipariş durumu "devam eden" (in_production) olan
 * siparişleri "beklemede" (pending) yapar.
 *
 * Çalıştırma: node scripts/mamul-depoda-devam-eden-to-beklemede.js
 */
const Database = require('better-sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, '..', 'data', 'erp.db')

const db = new Database(dbPath)

try {
  // Mamül depoda (in_stock/available) en az bir PSN'i olan ve siparişi "devam eden" (in_production) olan sipariş ID'leri
  const orderIds = db.prepare(`
    SELECT DISTINCT o.id
    FROM orders o
    INNER JOIN product_serial_numbers psn ON psn.production_order_id = o.production_order_id AND psn.production_order_id IS NOT NULL
    WHERE o.status = 'in_production'
      AND o.deleted_at IS NULL
      AND (psn.status = 'in_stock' OR psn.status = 'available')
  `).all()

  if (orderIds.length === 0) {
    console.log('Mamül depoda olup durumu devam eden sipariş bulunamadı. Çıkılıyor.')
    process.exit(0)
  }

  const ids = orderIds.map((r) => r.id)
  const placeholders = ids.map(() => '?').join(',')

  // Siparişleri beklemede yap
  const updateOrders = db.prepare(`
    UPDATE orders
    SET status = 'pending', updated_at = datetime('now')
    WHERE id IN (${placeholders})
  `)
  updateOrders.run(...ids)
  console.log(`${ids.length} sipariş 'beklemede' (pending) yapıldı.`)

  // İlgili üretim emirlerini de "planned" (beklemede) yap (aynı production_order_id'ye sahip siparişlerin hepsi artık pending)
  const poIds = db.prepare(`
    SELECT DISTINCT production_order_id
    FROM orders
    WHERE id IN (${placeholders}) AND production_order_id IS NOT NULL
  `).all(...ids).map((r) => r.production_order_id).filter(Boolean)

  if (poIds.length > 0) {
    const poPlaceholders = poIds.map(() => '?').join(',')
    const updatePO = db.prepare(`
      UPDATE production_orders
      SET status = 'planned', updated_at = datetime('now')
      WHERE id IN (${poPlaceholders}) AND status = 'in_progress'
    `)
    const poResult = updatePO.run(...poIds)
    console.log(`${poResult.changes} üretim emri 'planned' (beklemede) yapıldı.`)
  }

  console.log('İşlem tamamlandı.')
} catch (e) {
  console.error('Hata:', e.message)
  process.exit(1)
} finally {
  db.close()
}
