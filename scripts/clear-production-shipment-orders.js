/**
 * Üretim Emirleri, Üretim Takvimi, Usta Terminali ve Sevkiyat Siparişlerini Silme Scripti
 * Bu script sadece üretim ve sevkiyat ile ilgili verileri siler
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'erp.db');
const db = new Database(dbPath);

console.log('========================================');
console.log('  Üretim ve Sevkiyat Verileri Siliniyor');
console.log('========================================');
console.log('');

try {
  const result = db.transaction(() => {
    let deletedCounts = {};
    
    // 1. Shipment Items (Sevkiyat Kalemleri) - Önce bunları sil
    try {
      const deleted = db.prepare('DELETE FROM shipment_items').run();
      deletedCounts.shipment_items = deleted.changes;
      console.log(`✓ ${deleted.changes} sevkiyat kalemi silindi`);
    } catch (e) {
      console.warn(`⚠ shipment_items: ${e.message}`);
    }
    
    // 2. Shipments (Sevkiyatlar)
    try {
      const deleted = db.prepare('DELETE FROM shipments').run();
      deletedCounts.shipments = deleted.changes;
      console.log(`✓ ${deleted.changes} sevkiyat silindi`);
    } catch (e) {
      console.warn(`⚠ shipments: ${e.message}`);
    }
    
    // 3. Product Serial Numbers (Ürün Barkodları) - Üretim emirleri ile ilgili
    try {
      const deleted = db.prepare('DELETE FROM product_serial_numbers').run();
      deletedCounts.product_serial_numbers = deleted.changes;
      console.log(`✓ ${deleted.changes} ürün barkodu silindi`);
    } catch (e) {
      console.warn(`⚠ product_serial_numbers: ${e.message}`);
    }
    
    // 4. Production Actual Consumption (Fiili Harcanan Malzemeler)
    try {
      const deleted = db.prepare('DELETE FROM production_actual_consumption').run();
      deletedCounts.production_actual_consumption = deleted.changes;
      console.log(`✓ ${deleted.changes} fiili harcanan malzeme kaydı silindi`);
    } catch (e) {
      console.warn(`⚠ production_actual_consumption: ${e.message}`);
    }
    
    // 5. Stock Movements (Stok Hareketleri) - Üretim ve sevkiyat ile ilgili olanlar
    try {
      const deleted = db.prepare(`
        DELETE FROM stock_movements 
        WHERE reference_type IN ('production', 'production_order', 'shipment') 
           OR reference_id IN (SELECT id FROM production_orders)
           OR reference_id IN (SELECT id FROM shipments)
      `).run();
      deletedCounts.stock_movements = deleted.changes;
      console.log(`✓ ${deleted.changes} stok hareketi silindi (üretim/sevkiyat ile ilgili)`);
    } catch (e) {
      console.warn(`⚠ stock_movements: ${e.message}`);
    }
    
    // 6. Production Orders (Üretim Emirleri) - Üretim takvimi ve usta terminali buradan veri çekiyor
    try {
      const deleted = db.prepare('DELETE FROM production_orders').run();
      deletedCounts.production_orders = deleted.changes;
      console.log(`✓ ${deleted.changes} üretim emri silindi`);
    } catch (e) {
      console.warn(`⚠ production_orders: ${e.message}`);
    }
    
    // 7. Orders (Siparişler) - production_order_id ile bağlantılı olanlar
    try {
      // Önce production_order_id'yi NULL yap, sonra tüm siparişleri sil
      const updated = db.prepare('UPDATE orders SET production_order_id = NULL').run();
      console.log(`✓ ${updated.changes} siparişteki production_order_id temizlendi`);
      
      const deleted = db.prepare('DELETE FROM orders').run();
      deletedCounts.orders = deleted.changes;
      console.log(`✓ ${deleted.changes} sipariş silindi`);
    } catch (e) {
      console.warn(`⚠ orders: ${e.message}`);
    }
    
    return deletedCounts;
  })();
  
  console.log('');
  console.log('========================================');
  console.log('  ✓ Temizleme Tamamlandı!');
  console.log('========================================');
  console.log('');
  console.log('Silinen Veriler:');
  console.log('  - Üretim Emirleri (production_orders)');
  console.log('  - Üretim Takvimi (production_orders\'dan çekiliyor)');
  console.log('  - Usta Terminali (production_orders\'dan çekiliyor)');
  console.log('  - Sevkiyatlar (shipments, shipment_items)');
  console.log('  - Siparişler (orders)');
  console.log('  - Ürün Barkodları (product_serial_numbers)');
  console.log('  - Fiili Harcanan Malzemeler (production_actual_consumption)');
  console.log('  - Stok Hareketleri (üretim/sevkiyat ile ilgili)');
  console.log('');
  
  const totalDeleted = Object.values(result).reduce((sum, count) => sum + (count || 0), 0);
  console.log(`Toplam ${totalDeleted} kayıt temizlendi.`);
  
  db.close();
  process.exit(0);
} catch (error) {
  console.error('HATA:', error.message);
  db.close();
  process.exit(1);
}

