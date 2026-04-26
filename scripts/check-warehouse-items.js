/**
 * Mamül depodaki ürünleri kontrol et
 */

const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, '..', 'data', 'erp.db')
const db = new Database(dbPath)

try {
  // Toplam ürün sayısı
  const totalProducts = db.prepare(`
    SELECT COUNT(*) as count
    FROM products
    WHERE deleted_at IS NULL
  `).get()
  
  console.log(`Toplam ürün sayısı: ${totalProducts.count}\n`)

  // Completed station'daki kartlar
  const completedCards = db.prepare(`
    SELECT COUNT(*) as count
    FROM product_serial_numbers psn
    JOIN products p ON psn.product_id = p.id AND p.deleted_at IS NULL
    WHERE psn.current_station = 'completed'
      AND p.id IS NOT NULL
  `).get()
  
  console.log(`Completed station'daki kart sayısı: ${completedCards.count}\n`)

  // Detaylı bilgi
  const details = db.prepare(`
    SELECT 
      psn.id,
      psn.barcode,
      psn.serial_number,
      psn.current_station,
      psn.status,
      p.name as product_name,
      p.sku as product_sku,
      po.order_number as production_order_number
    FROM product_serial_numbers psn
    JOIN products p ON psn.product_id = p.id AND p.deleted_at IS NULL
    LEFT JOIN production_orders po ON psn.production_order_id = po.id
    WHERE psn.current_station = 'completed'
      AND p.id IS NOT NULL
    LIMIT 10
  `).all()
  
  console.log('İlk 10 completed kart:')
  details.forEach((item, index) => {
    console.log(`${index + 1}. ${item.product_name} (${item.product_sku}) - ${item.barcode} - Station: ${item.current_station} - Status: ${item.status}`)
  })
  
  // Tüm kartların station dağılımı
  const stationDistribution = db.prepare(`
    SELECT 
      COALESCE(psn.current_station, 'NULL') as station,
      COUNT(*) as count
    FROM product_serial_numbers psn
    JOIN products p ON psn.product_id = p.id AND p.deleted_at IS NULL
    WHERE p.id IS NOT NULL
    GROUP BY COALESCE(psn.current_station, 'NULL')
    ORDER BY count DESC
  `).all()
  
  console.log('\nStation dağılımı:')
  stationDistribution.forEach((item) => {
    console.log(`  ${item.station}: ${item.count} kart`)
  })
  
} catch (error) {
  console.error('Hata:', error)
} finally {
  db.close()
}
