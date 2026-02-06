#!/usr/bin/env node

/**
 * BOM ve Ayarlar Hariç Tüm İş Verilerini Silme
 *
 * SİLİNEN: Siparişler, üretim emirleri, barkodlar (product_serial_numbers),
 *   sevkiyatlar, faturalar, cari işlemler, stok hareketleri, ödemeler,
 *   yevmiye kayıtları, satın alma talepleri vb. (girilen ve devam eden veriler)
 *
 * KORUNAN: BOM (reçeteler), ürünler, malzemeler, cari hesaplar (müşteri/tedarikçi),
 *   kullanıcılar, hesap planı, birim dönüşümleri, operasyonlar, şirket/şube/depo.
 *
 * Çalıştırma: set ALLOW_DB_RESET=true && node scripts/clear-all-except-bom.js
 * (Windows: setx ALLOW_DB_RESET true sonra yeni terminalde node scripts/clear-all-except-bom.js)
 */

const { ensureDangerousAllowed, openDatabase } = require('./db-utils');

ensureDangerousAllowed('clear-all-except-bom.js');
const db = openDatabase();

console.log('========================================');
console.log('  BOM Hariç Tüm Veriler Siliniyor');
console.log('========================================');
console.log('');

try {
  const result = db.transaction(() => {
    let deletedCounts = {};
    
    // 1. Account Transactions (Cari Hesap İşlemleri)
    try {
      const deleted = db.prepare('DELETE FROM account_transactions').run();
      deletedCounts.account_transactions = deleted.changes;
      console.log(`✓ ${deleted.changes} cari hesap işlemi silindi`);
    } catch (e) {
      console.warn(`⚠ account_transactions: ${e.message}`);
    }
    
    // 2. Invoice Items (Fatura Kalemleri)
    try {
      const deleted = db.prepare('DELETE FROM invoice_items').run();
      deletedCounts.invoice_items = deleted.changes;
      console.log(`✓ ${deleted.changes} fatura kalemi silindi`);
    } catch (e) {
      console.warn(`⚠ invoice_items: ${e.message}`);
    }
    
    // 3. Invoices (Faturalar)
    try {
      const deleted = db.prepare('DELETE FROM invoices').run();
      deletedCounts.invoices = deleted.changes;
      console.log(`✓ ${deleted.changes} fatura silindi`);
    } catch (e) {
      console.warn(`⚠ invoices: ${e.message}`);
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
    
    // 8. Stock Movements (Stok Hareketleri) - Hammadde girişleri dahil
    try {
      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM stock_movements').get();
      console.log(`  Toplam stok hareketi sayısı: ${beforeCount.count}`);
      
      const deleted = db.prepare('DELETE FROM stock_movements').run();
      deletedCounts.stock_movements = deleted.changes;
      console.log(`✓ ${deleted.changes} stok hareketi silindi (hammadde girişleri dahil)`);
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
    
    // 9.5. Order Items (Sipariş Kalemleri) - Önce order_items silinmeli (foreign key)
    try {
      const deleted = db.prepare('DELETE FROM order_items').run();
      deletedCounts.order_items = deleted.changes;
      console.log(`✓ ${deleted.changes} sipariş kalemi silindi`);
    } catch (e) {
      // order_items tablosu yoksa hata verme
      if (!e.message.includes('no such table')) {
        console.warn(`⚠ order_items: ${e.message}`);
      }
    }
    
    // 10. Orders (Siparişler) - Tüm siparişleri sil (soft delete olanlar dahil)
    try {
      // Önce tüm siparişleri say
      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM orders').get();
      console.log(`  Toplam sipariş sayısı: ${beforeCount.count}`);
      
      // Tüm siparişleri sil (deleted_at kontrolü yapmadan)
      const deleted = db.prepare('DELETE FROM orders').run();
      deletedCounts.orders = deleted.changes;
      
      // Eğer silinen sayı toplam sayıdan azsa, uyarı ver
      if (deleted.changes < beforeCount.count) {
        const atlanan = beforeCount.count - deleted.changes;
        console.warn(`  ⚠ UYARI: ${atlanan} sipariş atlandı! (Toplam: ${beforeCount.count}, Silinen: ${deleted.changes})`);
        console.warn(`  ⚠ Muhtemelen foreign key constraint nedeniyle silinemedi.`);
      }
      
      console.log(`✓ ${deleted.changes} sipariş silindi`);
    } catch (e) {
      console.warn(`⚠ orders: ${e.message}`);
    }
    
    // 10.3. Stock Count Items (Stok Sayım Kalemleri)
    try {
      const deleted = db.prepare('DELETE FROM stock_count_items').run();
      deletedCounts.stock_count_items = deleted.changes;
      console.log(`✓ ${deleted.changes} stok sayım kalemi silindi`);
    } catch (e) {
      if (!e.message.includes('no such table')) {
        console.warn(`⚠ stock_count_items: ${e.message}`);
      }
    }
    
    // 10.4. Stock Counts (Stok Sayımları)
    try {
      const deleted = db.prepare('DELETE FROM stock_counts').run();
      deletedCounts.stock_counts = deleted.changes;
      console.log(`✓ ${deleted.changes} stok sayımı silindi`);
    } catch (e) {
      if (!e.message.includes('no such table')) {
        console.warn(`⚠ stock_counts: ${e.message}`);
      }
    }
    
    // 10.5. Material Stocks (Depo Bazlı Stok Kayıtları)
    try {
      const deleted = db.prepare('DELETE FROM material_stocks').run();
      deletedCounts.material_stocks = deleted.changes;
      console.log(`✓ ${deleted.changes} depo stok kaydı silindi`);
    } catch (e) {
      if (!e.message.includes('no such table')) {
        console.warn(`⚠ material_stocks: ${e.message}`);
      }
    }
    
    // 10.6. Stock Alerts (Stok Uyarıları)
    try {
      const deleted = db.prepare('DELETE FROM stock_alerts').run();
      deletedCounts.stock_alerts = deleted.changes;
      console.log(`✓ ${deleted.changes} stok uyarısı silindi`);
    } catch (e) {
      if (!e.message.includes('no such table')) {
        console.warn(`⚠ stock_alerts: ${e.message}`);
      }
    }
    
    // 10.7. Materials Stock (Hammadde Stokları) - Stok miktarlarını sıfırla
    try {
      const beforeStock = db.prepare('SELECT SUM(stock_amount) as total FROM materials').get();
      const totalStock = beforeStock.total || 0;
      console.log(`  Toplam hammadde stoku: ${totalStock}`);
      
      const updated = db.prepare('UPDATE materials SET stock_amount = 0').run();
      deletedCounts.materials_stock_reset = updated.changes;
      console.log(`✓ ${updated.changes} hammadde stoğu sıfırlandı`);
    } catch (e) {
      console.warn(`⚠ materials stock reset: ${e.message}`);
    }
    
    // 11. Purchase Requests (Satın Alma Talepleri)
    try {
      const deleted = db.prepare('DELETE FROM purchase_requests').run();
      deletedCounts.purchase_requests = deleted.changes;
      console.log(`✓ ${deleted.changes} satın alma talebi silindi`);
    } catch (e) {
      console.warn(`⚠ purchase_requests: ${e.message}`);
    }
    
    // 12. Payments (Ödemeler)
    try {
      const deleted = db.prepare('DELETE FROM payments').run();
      deletedCounts.payments = deleted.changes;
      console.log(`✓ ${deleted.changes} ödeme silindi`);
    } catch (e) {
      console.warn(`⚠ payments: ${e.message}`);
    }
    
    // 13. Notifications (Bildirimler)
    try {
      const deleted = db.prepare('DELETE FROM notifications').run();
      deletedCounts.notifications = deleted.changes;
      console.log(`✓ ${deleted.changes} bildirim silindi`);
    } catch (e) {
      console.warn(`⚠ notifications: ${e.message}`);
    }
    
    // 14. Journal Entry Lines (Yevmiye Satırları)
    try {
      const deleted = db.prepare('DELETE FROM journal_entry_lines').run();
      deletedCounts.journal_entry_lines = deleted.changes;
      console.log(`✓ ${deleted.changes} yevmiye satırı silindi`);
    } catch (e) {
      console.warn(`⚠ journal_entry_lines: ${e.message}`);
    }
    
    // 15. General Ledger (Defter-i Kebir)
    try {
      const deleted = db.prepare('DELETE FROM general_ledger').run();
      deletedCounts.general_ledger = deleted.changes;
      console.log(`✓ ${deleted.changes} defter-i kebir kaydı silindi`);
    } catch (e) {
      console.warn(`⚠ general_ledger: ${e.message}`);
    }
    
    // 16. Journal Entries (Yevmiye Kayıtları)
    try {
      const deleted = db.prepare('DELETE FROM journal_entries').run();
      deletedCounts.journal_entries = deleted.changes;
      console.log(`✓ ${deleted.changes} yevmiye kaydı silindi`);
    } catch (e) {
      console.warn(`⚠ journal_entries: ${e.message}`);
    }
    
    // 17. Materials (Malzemeler) - SİLİNMEZ; BOM malzeme referansları için korunur. Stok 10.7'de sıfırlandı.

    // 18. Accounts (Cari Hesaplar) - SİLİNMEZ; ayarlar/şablonlar kalsın. Bakiyeler account_transactions silindiği için sıfırlanır.
    
    // 19. Stok miktarlarını sıfırla (products)
    try {
      const deleted = db.prepare('UPDATE products SET stock_amount = 0').run();
      deletedCounts.products_stock_reset = deleted.changes;
      console.log(`✓ ${deleted.changes} ürün stoğu sıfırlandı`);
    } catch (e) {
      console.warn(`⚠ products stock reset: ${e.message}`);
    }
    
    // NOT: BOM tablosu korunuyor - silinmiyor!
    
    return deletedCounts;
  })();
  
  console.log('');
  console.log('========================================');
  console.log('  ✓ Temizleme Tamamlandı!');
  console.log('========================================');
  console.log('');
  console.log('Korunan Tablolar (BOM + ayarlar):');
  console.log('  - bom, bom_versions (Ürün reçeteleri)');
  console.log('  - products, materials (Ürünler ve malzemeler)');
  console.log('  - accounts (Cari hesaplar)');
  console.log('  - users (Kullanıcılar)');
  console.log('  - chart_of_accounts, unit_conversions, operations, work_centers');
  console.log('  - companies, branches, warehouses');
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
