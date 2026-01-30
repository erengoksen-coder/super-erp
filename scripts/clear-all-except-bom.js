/**
 * BOM Hariç Tüm Verileri Silme Scripti
 * BOM (Bill of Materials) korunur, diğer tüm veriler silinir
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'erp.db');
const db = new Database(dbPath);

console.log('========================================');
console.log('  BOM Hariç Tüm Veriler Siliniyor');
console.log('========================================');
console.log('');

try {
  const result = db.transaction(() => {
    let deletedCounts = {};
    
    // 1. Journal Entry Lines (Yevmiye Satırları)
    try {
      const deleted = db.prepare('DELETE FROM journal_entry_lines').run();
      deletedCounts.journal_entry_lines = deleted.changes;
      console.log(`✓ ${deleted.changes} yevmiye satırı silindi`);
    } catch (e) {
      console.warn(`⚠ journal_entry_lines: ${e.message}`);
    }
    
    // 2. General Ledger (Defter-i Kebir)
    try {
      const deleted = db.prepare('DELETE FROM general_ledger').run();
      deletedCounts.general_ledger = deleted.changes;
      console.log(`✓ ${deleted.changes} defter-i kebir kaydı silindi`);
    } catch (e) {
      console.warn(`⚠ general_ledger: ${e.message}`);
    }
    
    // 3. Journal Entries (Yevmiye Kayıtları)
    try {
      const deleted = db.prepare('DELETE FROM journal_entries').run();
      deletedCounts.journal_entries = deleted.changes;
      console.log(`✓ ${deleted.changes} yevmiye kaydı silindi`);
    } catch (e) {
      console.warn(`⚠ journal_entries: ${e.message}`);
    }
    
    // 4. Shipment Items (Sevkiyat Kalemleri)
    try {
      const deleted = db.prepare('DELETE FROM shipment_items').run();
      deletedCounts.shipment_items = deleted.changes;
      console.log(`✓ ${deleted.changes} sevkiyat kalemi silindi`);
    } catch (e) {
      console.warn(`⚠ shipment_items: ${e.message}`);
    }
    
    // 5. Shipments (Sevkiyatlar)
    try {
      const deleted = db.prepare('DELETE FROM shipments').run();
      deletedCounts.shipments = deleted.changes;
      console.log(`✓ ${deleted.changes} sevkiyat silindi`);
    } catch (e) {
      console.warn(`⚠ shipments: ${e.message}`);
    }
    
    // 6. Product Serial Numbers (Ürün Barkodları)
    try {
      const deleted = db.prepare('DELETE FROM product_serial_numbers').run();
      deletedCounts.product_serial_numbers = deleted.changes;
      console.log(`✓ ${deleted.changes} ürün barkodu silindi`);
    } catch (e) {
      console.warn(`⚠ product_serial_numbers: ${e.message}`);
    }
    
    // 7. Production Actual Consumption (Fiili Harcanan Malzemeler)
    try {
      const deleted = db.prepare('DELETE FROM production_actual_consumption').run();
      deletedCounts.production_actual_consumption = deleted.changes;
      console.log(`✓ ${deleted.changes} fiili harcanan malzeme kaydı silindi`);
    } catch (e) {
      console.warn(`⚠ production_actual_consumption: ${e.message}`);
    }
    
    // 8. Stock Movements (Stok Hareketleri)
    try {
      const deleted = db.prepare('DELETE FROM stock_movements').run();
      deletedCounts.stock_movements = deleted.changes;
      console.log(`✓ ${deleted.changes} stok hareketi silindi`);
    } catch (e) {
      console.warn(`⚠ stock_movements: ${e.message}`);
    }
    
    // 9. Production Orders (Üretim Emirleri)
    try {
      const deleted = db.prepare('DELETE FROM production_orders').run();
      deletedCounts.production_orders = deleted.changes;
      console.log(`✓ ${deleted.changes} üretim emri silindi`);
    } catch (e) {
      console.warn(`⚠ production_orders: ${e.message}`);
    }
    
    // 10. Orders (Siparişler)
    try {
      const deleted = db.prepare('DELETE FROM active_orders').run();
      deletedCounts.orders = deleted.changes;
      console.log(`✓ ${deleted.changes} sipariş silindi`);
    } catch (e) {
      console.warn(`⚠ orders: ${e.message}`);
    }
    
    // 11. Purchase Requests (Satın Alma Talepleri)
    try {
      const deleted = db.prepare('DELETE FROM purchase_requests').run();
      deletedCounts.purchase_requests = deleted.changes;
      console.log(`✓ ${deleted.changes} satın alma talebi silindi`);
    } catch (e) {
      console.warn(`⚠ purchase_requests: ${e.message}`);
    }
    
    // 12. Stok miktarlarını sıfırla (products ve materials)
    try {
      const deleted = db.prepare('UPDATE products SET stock_amount = 0').run();
      deletedCounts.products_stock_reset = deleted.changes;
      console.log(`✓ ${deleted.changes} ürün stoğu sıfırlandı`);
    } catch (e) {
      console.warn(`⚠ products stock reset: ${e.message}`);
    }
    
    try {
      const deleted = db.prepare('UPDATE materials SET stock_amount = 0').run();
      deletedCounts.materials_stock_reset = deleted.changes;
      console.log(`✓ ${deleted.changes} malzeme stoğu sıfırlandı`);
    } catch (e) {
      console.warn(`⚠ materials stock reset: ${e.message}`);
    }
    
    // 13. Accounts bakiyelerini sıfırla
    try {
      const deleted = db.prepare('UPDATE accounts SET balance = 0').run();
      deletedCounts.accounts_balance_reset = deleted.changes;
      console.log(`✓ ${deleted.changes} cari hesap bakiyesi sıfırlandı`);
    } catch (e) {
      console.warn(`⚠ accounts balance reset: ${e.message}`);
    }
    
    // NOT: BOM tablosu korunuyor - silinmiyor!
    
    return deletedCounts;
  })();
  
  console.log('');
  console.log('========================================');
  console.log('  ✓ Temizleme Tamamlandı!');
  console.log('========================================');
  console.log('');
  console.log('Korunan Tablolar:');
  console.log('  - bom (Ürün Reçeteleri)');
  console.log('  - products (Ürünler)');
  console.log('  - materials (Malzemeler)');
  console.log('  - users (Kullanıcılar)');
  console.log('  - accounts (Cari Hesaplar)');
  console.log('  - chart_of_accounts (Hesap Planı)');
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

