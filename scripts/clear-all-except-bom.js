#!/usr/bin/env node

const Database = require('better-sqlite3')
const { join } = require('path')
const { existsSync } = require('fs')
const { Client } = require('pg')

const SAFE_FLAG = String(process.env.ALLOW_DB_RESET || '').toLowerCase() === 'true'
const MODE = process.argv.includes('--yes')

if (!SAFE_FLAG || !MODE) {
  console.error('Bu işlem veri silecektir. Devam etmek için: ALLOW_DB_RESET=true node scripts/clear-all-except-bom.js --yes')
  process.exit(1)
}

async function clearSqlite() {
  const dbPath = join(process.cwd(), 'data', 'erp.db')
  if (!existsSync(dbPath)) {
    console.warn('SQLite veritabanı bulunamadı:', dbPath)
    return
  }

  const db = new Database(dbPath)
  try {
    db.pragma('foreign_keys = OFF')
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((row) => row.name)
      .filter((name) => !['bom', 'bom_versions'].includes(name))

    const deleteStmt = db.transaction(() => {
      for (const name of tables) {
        db.prepare(`DELETE FROM ${name}`).run()
      }
    })

    deleteStmt()
    console.log(`SQLite temizlendi. Silinen tablolar: ${tables.length}`)
  } finally {
    db.close()
  }
}

async function clearSupabase() {
  const connString = process.env.SUPABASE_DB_URL || process.env.SUPABASE_DATABASE_URL
  if (!connString) {
    console.warn('SUPABASE_DB_URL veya SUPABASE_DATABASE_URL yok, Supabase temizliği atlandı.')
    return
  }

  const sslDisabled = String(process.env.SUPABASE_DB_SSL || '').toLowerCase() === 'false'
  const client = new Client({
    connectionString: connString,
    ...(sslDisabled ? {} : { ssl: { rejectUnauthorized: false } }),
  })

  await client.connect()
  try {
    const { rows } = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `)

    const keep = new Set(['bom', 'bom_versions', 'supabase_migrations', 'schema_migrations'])
    const tables = rows.map((r) => r.tablename).filter((name) => !keep.has(name))

    if (tables.length === 0) {
      console.log('Supabase: Silinecek tablo yok.')
      return
    }

    await client.query(`TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`)
    console.log(`Supabase temizlendi. Silinen tablolar: ${tables.length}`)
  } finally {
    await client.end()
  }
}

async function run() {
  await clearSqlite()
  await clearSupabase()
}

run().catch((error) => {
  console.error('Temizlik başarısız:', error.message)
  process.exit(1)
})
/**
 * BOM Hariç Tüm Verileri Silme Scripti
 * BOM (Bill of Materials) korunur, diğer tüm veriler silinir
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

