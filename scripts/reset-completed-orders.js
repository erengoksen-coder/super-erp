/**
 * Tamamlanmış ürünleri tekrar üretim emirlerine döndür
 * Kullanım: node scripts/reset-completed-orders.js
 */

const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, '..', 'data', 'erp.db')
const db = new Database(dbPath)

// WAL mode ve diğer ayarlar
try {
  db.pragma('journal_mode = WAL')
} catch (error) {
  console.error('WAL mode ayarlanamadı:', error)
}
db.pragma('busy_timeout = 5000')
db.pragma('foreign_keys = OFF')

console.log('Tamamlanmış ürünleri üretim emirlerine döndürülüyor...\n')

try {
  // Önce completed station'daki kartları bul
  const completedCards = db.prepare(`
    SELECT DISTINCT psn.production_order_id, po.id, po.order_number, po.quantity, po.status
    FROM product_serial_numbers psn
    JOIN production_orders po ON psn.production_order_id = po.id
    WHERE psn.current_station = 'completed'
  `).all()

  console.log(`Bulunan completed station'daki kart sayısı: ${completedCards.length}\n`)

  if (completedCards.length === 0) {
    console.log('Completed station\'da kart bulunamadı.')
    process.exit(0)
  }

  // Unique production order'ları al
  const orderMap = new Map()
  for (const card of completedCards) {
    if (!orderMap.has(card.production_order_id)) {
      orderMap.set(card.production_order_id, {
        id: card.id,
        order_number: card.order_number,
        quantity: card.quantity,
        status: card.status
      })
    }
  }

  const completedOrders = Array.from(orderMap.values())
  console.log(`Bulunan tamamlanmış üretim emri sayısı: ${completedOrders.length}\n`)

  // Her üretim emri için
  for (const order of completedOrders) {
    console.log(`İşleniyor: ${order.order_number} (${order.quantity} adet)`)

    // Bu üretim emrine ait tamamlanmış kartları bul
    const completedCards = db.prepare(`
      SELECT psn.id, psn.barcode, psn.serial_number, psn.current_station
      FROM product_serial_numbers psn
      WHERE psn.production_order_id = ?
        AND psn.current_station = 'completed'
    `).all(order.id)

    console.log(`  - ${completedCards.length} kart bulundu`)

    if (completedCards.length === 0) {
      console.log(`  - Uyarı: ${order.order_number} için tamamlanmış kart bulunamadı, atlanıyor\n`)
      continue
    }

    // Tüm kartları iskelet istasyonuna geri gönder
    const now = new Date().toISOString()
    
    db.prepare(`
      UPDATE product_serial_numbers
      SET current_station = 'iskelet',
          status = NULL,
          updated_at = ?
      WHERE production_order_id = ?
        AND current_station = 'completed'
    `).run(now, order.id)

    // Üretim emrini iskelet istasyonuna geri gönder
    db.prepare(`
      UPDATE production_orders
      SET status = 'in_progress',
          current_station = 'iskelet',
          completed_at = NULL,
          iskelet_completed_count = 0,
          terzihane_completed_count = 0,
          berjer_completed_count = 0,
          döseme_completed_count = 0,
          montaj_completed_count = 0,
          sevkiyat_completed_count = 0,
          iskelet_completed_at = NULL,
          terzihane_completed_at = NULL,
          berjer_completed_at = NULL,
          döseme_completed_at = NULL,
          montaj_completed_at = NULL,
          sevkiyat_completed_at = NULL,
          updated_at = ?
      WHERE id = ?
    `).run(now, order.id)

    console.log(`  ✓ ${order.order_number} iskelet istasyonuna geri gönderildi\n`)
  }

  console.log('✓ Tüm işlemler tamamlandı!')
  
} catch (error) {
  console.error('Hata:', error)
  process.exit(1)
} finally {
  db.close()
}
