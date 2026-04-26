/**
 * Bir seferlik: Mamül depoda (in_stock/available) görünen ürünleri mamül depodan kaldırır
 * ve beklemede durumuna alır (PSN → in_production, sipariş → pending).
 *
 * Çalıştırma: node scripts/mamul-depodan-kaldir-beklemede.js
 */
const Database = require('better-sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, '..', 'data', 'erp.db')

const db = new Database(dbPath)

try {
  // Mamül depoda olan tüm PSN'ler (in_stock veya available)
  const psnRows = db.prepare(`
    SELECT id, barcode, production_order_id, status
    FROM product_serial_numbers
    WHERE (status = 'in_stock' OR status = 'available')
  `).all()

  if (psnRows.length === 0) {
    console.log('Mamül depoda ürün bulunamadı. Çıkılıyor.')
    process.exit(0)
  }

  const psnIds = psnRows.map((r) => r.id)
  const poIds = [...new Set(psnRows.map((r) => r.production_order_id).filter(Boolean))]

  // 1) PSN'leri mamül depodan kaldır: status = in_production, ready_for_shipment = 0
  const psnPlaceholders = psnIds.map(() => '?').join(',')
  const updatePsn = db.prepare(`
    UPDATE product_serial_numbers
    SET status = 'in_production', ready_for_shipment = 0
    WHERE id IN (${psnPlaceholders})
  `)
  updatePsn.run(...psnIds)
  console.log(`${psnIds.length} ürün mamül depodan kaldırıldı (durum: in_production).`)

  // 2) Bu PSN'lere bağlı siparişleri beklemede yap
  if (poIds.length > 0) {
    const poPlaceholders = poIds.map(() => '?').join(',')
    const orderUpdate = db.prepare(`
      UPDATE orders
      SET status = 'pending', updated_at = datetime('now')
      WHERE production_order_id IN (${poPlaceholders}) AND deleted_at IS NULL
    `)
    const orderResult = orderUpdate.run(...poIds)
    console.log(`${orderResult.changes} sipariş 'beklemede' (pending) yapıldı.`)

    // 3) Üretim emirlerini beklemede yap (pending veya planned - DB'de hangisi varsa)
    const updatePO = db.prepare(`
      UPDATE production_orders
      SET status = 'pending', updated_at = datetime('now')
      WHERE id IN (${poPlaceholders}) AND deleted_at IS NULL AND status IN ('in_progress', 'planned')
    `)
    const poResult = updatePO.run(...poIds)
    console.log(`${poResult.changes} üretim emri 'pending' (beklemede) yapıldı.`)
  }

  console.log('İşlem tamamlandı.')
} catch (e) {
  console.error('Hata:', e.message)
  process.exit(1)
} finally {
  db.close()
}
