/**
 * Local SQLite Veritabanı
 * Supabase olmadan bilgisayarda çalışır
 */

import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { createHash } from 'crypto'

// Veritabanı dosyası proje klasöründe saklanır
const dbPath = join(process.cwd(), 'data', 'erp.db')

// Klasör yoksa oluştur
const dataDir = join(process.cwd(), 'data')
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

// Veritabanı bağlantısı
let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL') // Performans için
    initializeDatabase()
  }
  return db
}

/**
 * Veritabanı tablolarını oluştur
 */
function initializeDatabase() {
  if (!db) return

  // Users (Kullanıcılar)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'user',
      job_title TEXT,
      is_approved INTEGER DEFAULT 0,
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT,
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `)

  // User Permissions (Kullanıcı İzinleri)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      page_path TEXT NOT NULL,
      can_view INTEGER DEFAULT 1,
      can_create INTEGER DEFAULT 0,
      can_edit INTEGER DEFAULT 0,
      can_delete INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, page_path)
    )
  `)

  // Materials (Hammaddeler)
  db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      category TEXT,
      unit TEXT NOT NULL,
      stock_amount REAL DEFAULT 0,
      min_stock_level REAL DEFAULT 0,
      purchase_price REAL DEFAULT 0,
      supplier_id TEXT,
      last_purchase_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES accounts(id)
    )
  `)

  // Materials tablosuna purchase_price kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE materials ADD COLUMN purchase_price REAL DEFAULT 0')
  } catch {}
  // Materials tablosuna code ve category kolonları ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE materials ADD COLUMN code TEXT UNIQUE')
  } catch {}
  try {
    db.exec('ALTER TABLE materials ADD COLUMN category TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE materials ADD COLUMN supplier_id TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE materials ADD COLUMN last_purchase_date TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE materials ADD COLUMN unit_price REAL DEFAULT 0')
  } catch {}
  
  // Eğer unit_price yoksa ve purchase_price varsa, purchase_price değerini unit_price'a kopyala
  try {
    db.exec(`
      UPDATE materials 
      SET unit_price = purchase_price 
      WHERE (unit_price = 0 OR unit_price IS NULL) AND purchase_price > 0
    `)
  } catch (e: any) {
    // Hata durumunda sessizce devam et
  }

  // Products (Mamüller)
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      stock_amount INTEGER DEFAULT 0,
      min_stock_level INTEGER DEFAULT 5,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Products tablosuna stock kolonları ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE products ADD COLUMN stock_amount INTEGER DEFAULT 0')
  } catch {}
  try {
    db.exec('ALTER TABLE products ADD COLUMN min_stock_level INTEGER DEFAULT 5')
  } catch {}
  try {
    db.exec('ALTER TABLE products ADD COLUMN labor_cost REAL DEFAULT 0')
  } catch {}
  
  // Products tablosuna selling_price kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE products ADD COLUMN selling_price REAL DEFAULT 0')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('selling_price kolonu eklenirken hata:', e.message)
    }
  }
  
  // Eğer selling_price yoksa ve price varsa, price değerini selling_price'a kopyala
  try {
    db.exec(`
      UPDATE products 
      SET selling_price = price 
      WHERE (selling_price = 0 OR selling_price IS NULL) AND price > 0
    `)
  } catch (e: any) {
    // Hata durumunda sessizce devam et
  }
  
  // Production Orders tablosuna maliyet kolonları ekle
  try {
    db.exec('ALTER TABLE production_orders ADD COLUMN material_cost REAL DEFAULT 0')
  } catch {}
  try {
    db.exec('ALTER TABLE production_orders ADD COLUMN labor_cost REAL DEFAULT 0')
  } catch {}
  try {
    db.exec('ALTER TABLE production_orders ADD COLUMN total_cost REAL DEFAULT 0')
  } catch {}
  try {
    db.exec('ALTER TABLE production_orders ADD COLUMN selling_price REAL DEFAULT 0')
  } catch {}
  try {
    db.exec('ALTER TABLE production_orders ADD COLUMN profit REAL DEFAULT 0')
  } catch {}
  // Production Orders tablosuna tarih kolonları ekle
  try {
    db.exec('ALTER TABLE production_orders ADD COLUMN due_date TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE production_orders ADD COLUMN estimated_completion_date TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE production_orders ADD COLUMN started_at TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE production_orders ADD COLUMN completed_at TEXT')
  } catch {}
  
  // Fiili Harcanan Malzemeler Tablosu
  db.exec(`
    CREATE TABLE IF NOT EXISTS production_actual_consumption (
      id TEXT PRIMARY KEY,
      production_order_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      planned_quantity REAL NOT NULL,
      actual_quantity REAL,
      fire_quantity REAL,
      variance REAL,
      variance_percentage REAL,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id),
      UNIQUE(production_order_id, material_id)
    )
  `)

  // BOM (Ürün Reçetesi)
  db.exec(`
    CREATE TABLE IF NOT EXISTS bom (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity_required REAL NOT NULL,
      fire_percentage REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
      UNIQUE(product_id, material_id)
    )
  `)

  // Production Orders (Üretim Emirleri)
  db.exec(`
    CREATE TABLE IF NOT EXISTS production_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      current_station TEXT DEFAULT 'iskelet',
      iskelet_started_at TEXT,
      iskelet_completed_at TEXT,
      terzihane_started_at TEXT,
      terzihane_completed_at TEXT,
      döseme_started_at TEXT,
      döseme_completed_at TEXT,
      montaj_started_at TEXT,
      montaj_completed_at TEXT,
      sevkiyat_started_at TEXT,
      sevkiyat_completed_at TEXT,
      stock_deducted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)
  
  // İstasyon kolonları ekle
  try { db.exec('ALTER TABLE production_orders ADD COLUMN current_station TEXT DEFAULT "iskelet"') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN iskelet_started_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN iskelet_completed_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN terzihane_started_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN terzihane_completed_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN döseme_started_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN döseme_completed_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN montaj_started_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN montaj_completed_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN sevkiyat_started_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN sevkiyat_completed_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN stock_deducted INTEGER DEFAULT 0') } catch {}

  // Stock Movements (Stok Hareketleri)
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      material_id TEXT,
      product_id TEXT,
      movement_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      CHECK ((material_id IS NOT NULL) OR (product_id IS NOT NULL))
    )
  `)
  
  // Eski veritabanlarında material_id NOT NULL olabilir, NULL yapılabilir hale getir
  // SQLite'da ALTER TABLE ile NOT NULL kaldırılamaz, bu yüzden yeni tablo oluşturup veri taşıma gerekir
  // Ancak bu karmaşık olduğu için, INSERT sorgularında material_id'yi NULL yerine boş string veya özel bir değer kullanabiliriz
  // Ama daha iyi çözüm: material_id'yi her zaman belirtmek, product için özel bir değer kullanmak
  // En iyi çözüm: material_id'yi NULL yapılabilir hale getirmek için tabloyu yeniden oluştur
  
  // product_id kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE stock_movements ADD COLUMN product_id TEXT')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('product_id kolonu eklenirken hata:', e.message)
    }
  }
  
  // Eski veritabanlarında material_id NOT NULL olabilir, tabloyu kontrol et ve gerekirse düzelt
  try {
    const tableInfo = db.prepare("PRAGMA table_info(stock_movements)").all() as any[]
    const materialIdColumn = tableInfo.find((col: any) => col.name === 'material_id')
    const productIdColumn = tableInfo.find((col: any) => col.name === 'product_id')
    
    // Eğer material_id NOT NULL ise ve product_id kolonu varsa, tabloyu yeniden oluştur
    if (materialIdColumn && materialIdColumn.notnull === 1 && productIdColumn) {
      // Verileri yedekle
      const oldData = db.prepare('SELECT * FROM stock_movements').all()
      
      // Eski tabloyu yedekle
      db.exec('DROP TABLE IF EXISTS stock_movements_backup')
      db.exec('ALTER TABLE stock_movements RENAME TO stock_movements_backup')
      
      // Yeni tabloyu oluştur (material_id NULL yapılabilir)
      db.exec(`
        CREATE TABLE stock_movements (
          id TEXT PRIMARY KEY,
          material_id TEXT,
          product_id TEXT,
          movement_type TEXT NOT NULL,
          quantity REAL NOT NULL,
          reference_type TEXT,
          reference_id TEXT,
          invoice_number TEXT,
          shipment_number TEXT,
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (material_id) REFERENCES materials(id),
          FOREIGN KEY (product_id) REFERENCES products(id),
          CHECK ((material_id IS NOT NULL) OR (product_id IS NOT NULL))
        )
      `)
      
      // Verileri geri yükle
      const insertStmt = db.prepare(`
        INSERT INTO stock_movements 
        (id, material_id, product_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      for (const row of oldData as any[]) {
        insertStmt.run(
          row.id,
          row.material_id || null,
          row.product_id || null,
          row.movement_type,
          row.quantity,
          row.reference_type || null,
          row.reference_id || null,
          row.notes || null,
          row.created_at || new Date().toISOString()
        )
      }
      
      // Yedek tabloyu sil
      db.exec('DROP TABLE IF EXISTS stock_movements_backup')
    }
  } catch (e: any) {
    // Hata durumunda sessizce devam et
    console.warn('stock_movements tablosu güncellenirken hata:', e.message)
  }
  
  // Eski veritabanlarında material_id NOT NULL ise, tabloyu yeniden oluştur
  try {
    // Önce mevcut tablonun yapısını kontrol et
    const tableInfo = db.prepare("PRAGMA table_info(stock_movements)").all() as any[]
    const materialIdColumn = tableInfo.find((col: any) => col.name === 'material_id')
    
    // Eğer material_id NOT NULL ise ve product_id kolonu yoksa, tabloyu yeniden oluştur
    if (materialIdColumn && materialIdColumn.notnull === 1 && !tableInfo.find((col: any) => col.name === 'product_id')) {
      // Verileri yedekle
      const oldData = db.prepare('SELECT * FROM stock_movements').all()
      
      // Eski tabloyu sil
      db.exec('DROP TABLE IF EXISTS stock_movements_backup')
      db.exec('ALTER TABLE stock_movements RENAME TO stock_movements_backup')
      
      // Yeni tabloyu oluştur (material_id NULL yapılabilir)
      db.exec(`
        CREATE TABLE stock_movements (
          id TEXT PRIMARY KEY,
          material_id TEXT,
          product_id TEXT,
          movement_type TEXT NOT NULL,
          quantity REAL NOT NULL,
          reference_type TEXT,
          reference_id TEXT,
          invoice_number TEXT,
          shipment_number TEXT,
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (material_id) REFERENCES materials(id),
          FOREIGN KEY (product_id) REFERENCES products(id),
          CHECK ((material_id IS NOT NULL) OR (product_id IS NOT NULL))
        )
      `)
      
      // Verileri geri yükle
      const insertStmt = db.prepare(`
        INSERT INTO stock_movements 
        (id, material_id, product_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      for (const row of oldData) {
        insertStmt.run(
          row.id,
          row.material_id,
          row.product_id || null,
          row.movement_type,
          row.quantity,
          row.reference_type,
          row.reference_id,
          row.notes,
          row.created_at
        )
      }
      
      // Yedek tabloyu sil
      db.exec('DROP TABLE IF EXISTS stock_movements_backup')
    }
  } catch (e: any) {
    // Hata durumunda sessizce devam et
    console.warn('stock_movements tablosu güncellenirken hata:', e.message)
  }
  
  // invoice_number ve shipment_number kolonlarını ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE stock_movements ADD COLUMN invoice_number TEXT')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('invoice_number kolonu eklenirken hata:', e.message)
    }
  }
  
  try {
    db.exec('ALTER TABLE stock_movements ADD COLUMN shipment_number TEXT')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('shipment_number kolonu eklenirken hata:', e.message)
    }
  }

  // Purchase Requests (Satın Alma Talepleri)
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_requests (
      id TEXT PRIMARY KEY,
      request_number TEXT UNIQUE NOT NULL,
      material_id TEXT NOT NULL,
      requested_quantity REAL NOT NULL,
      unit_price REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `)

  // Product Serial Numbers (Ürün Barkodları)
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_serial_numbers (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      serial_number TEXT UNIQUE NOT NULL,
      barcode TEXT UNIQUE NOT NULL,
      production_order_id TEXT,
      status TEXT DEFAULT 'in_stock',
      customer_id TEXT,
      ready_for_shipment INTEGER DEFAULT 0,
      shipment_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sold_at TEXT,
      notes TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id),
      FOREIGN KEY (customer_id) REFERENCES accounts(id)
      -- NOT: shipment_id için foreign key yok çünkü SQLite'da ALTER TABLE ile eklenemez
      -- Foreign key kontrolü uygulama seviyesinde yapılacak
    )
  `)
  
  // customer_id kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE product_serial_numbers ADD COLUMN customer_id TEXT')
  } catch {}
  
  // ready_for_shipment kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE product_serial_numbers ADD COLUMN ready_for_shipment INTEGER DEFAULT 0')
  } catch (e: any) {
    // Kolon zaten varsa hata verme
    if (!e.message?.includes('duplicate column')) {
      console.warn('ready_for_shipment kolonu eklenirken hata:', e.message)
    }
  }
  
  // shipment_id kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE product_serial_numbers ADD COLUMN shipment_id TEXT')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column') && !e.message?.includes('no such column')) {
      console.warn('shipment_id kolonu eklenirken hata:', e.message)
    }
  }
  
  // updated_at kolonu ekle (eğer yoksa) - ÖNEMLİ: Bu kolon UPDATE sorgularında kullanılıyor
  try {
    db.exec('ALTER TABLE product_serial_numbers ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP')
  } catch (e: any) {
    // Kolon zaten varsa veya başka bir hata varsa sessizce devam et
    if (!e.message?.includes('duplicate column') && !e.message?.includes('no such column')) {
      console.warn('updated_at kolonu eklenirken hata:', e.message)
    }
  }
  
  // İndeksler
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_serial_numbers_product ON product_serial_numbers(product_id)')
  } catch {}
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_serial_numbers_barcode ON product_serial_numbers(barcode)')
  } catch {}
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_serial_numbers_serial ON product_serial_numbers(serial_number)')
  } catch {}

  // Trigger'ı kaldır (çift güncelleme sorununu önlemek için)
  // Stok güncellemeleri artık sadece API'lerde yapılıyor
  try {
    db.exec('DROP TRIGGER IF EXISTS update_material_stock')
  } catch (e: any) {
    // Trigger yoksa hata vermesin
    console.warn('Trigger kaldırılırken hata:', e.message)
  }

  // Accounts (Cari Hesaplar - Müşteri ve Tedarikçiler)
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'customer',
      tax_number TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      balance REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Chart of Accounts (Hesap Planı)
  db.exec(`
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      parent_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id)
    )
  `)

  // Journal Entries (Yevmiye Kayıtları)
  db.exec(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      entry_number TEXT UNIQUE NOT NULL,
      entry_date TEXT NOT NULL,
      description TEXT,
      total_debit REAL DEFAULT 0,
      total_credit REAL DEFAULT 0,
      reference_type TEXT,
      reference_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT
    )
  `)

  // Journal Entry Lines (Yevmiye Satırları)
  db.exec(`
    CREATE TABLE IF NOT EXISTS journal_entry_lines (
      id TEXT PRIMARY KEY,
      journal_entry_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      description TEXT,
      FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
    )
  `)

  // General Ledger (Defter-i Kebir)
  db.exec(`
    CREATE TABLE IF NOT EXISTS general_ledger (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      journal_entry_id TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id),
      FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
    )
  `)

  // Shipments (Sevkiyatlar)
  db.exec(`
    CREATE TABLE IF NOT EXISTS shipments (
      id TEXT PRIMARY KEY,
      shipment_number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      shipment_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      total_quantity INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      final_amount REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES accounts(id)
    )
  `)
  
  // Shipments tablosuna yeni kolonlar ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN total_amount REAL DEFAULT 0')
  } catch {}
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN tax_rate REAL DEFAULT 0')
  } catch {}
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN tax_amount REAL DEFAULT 0')
  } catch {}
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN final_amount REAL DEFAULT 0')
  } catch {}

  // Shipment Items (Sevkiyat Kalemleri)
  db.exec(`
    CREATE TABLE IF NOT EXISTS shipment_items (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      serial_numbers TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)

  // Varsayılan admin kullanıcı oluştur (şifre: admin123)
  const { createHash } = require('crypto')
  const adminPasswordHash = createHash('sha256').update('admin123').digest('hex')
  try {
    db.prepare(`
      INSERT OR IGNORE INTO users (id, username, email, password_hash, full_name, role, is_approved, job_title)
      VALUES ('admin-001', 'admin', 'admin@livasofa.com', ?, 'Sistem Yöneticisi', 'admin', 1, 'Yönetici')
    `).run(adminPasswordHash)
  } catch (e) {
    // Admin zaten varsa hata verme
  }

  // Örnek veriler (sadece ilk kurulumda)
  seedInitialData()
}

/**
 * İlk kurulum için örnek veriler
 */
function seedInitialData() {
  if (!db) return

  // Materials (Hammaddeler)
  const materials = [
    { id: 'mat-1', code: 'KUMAŞ-001', name: 'Kumaş - Chester', category: 'Kumaş', unit: 'm²', stock_amount: 50.0, min_stock_level: 20.0 },
    { id: 'mat-2', code: 'SÜNGER-001', name: 'Sünger - Orta Sert', category: 'Sünger', unit: 'kg', stock_amount: 100.0, min_stock_level: 30.0 },
    { id: 'mat-3', code: 'AHŞAP-001', name: 'Ahşap - Meşe', category: 'Ahşap', unit: 'm', stock_amount: 200.0, min_stock_level: 50.0 },
  ]

  const insertMaterial = db.prepare(`
    INSERT OR IGNORE INTO materials (id, code, name, category, unit, stock_amount, min_stock_level)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  materials.forEach(m => {
    insertMaterial.run(m.id, m.code, m.name, m.category, m.unit, m.stock_amount, m.min_stock_level)
  })

  // Products (Mamüller)
  const products = [
    { id: 'prod-1', name: 'Chester Koltuk', sku: 'KOL-001', price: 850.00, selling_price: 850.00 },
    { id: 'prod-2', name: 'Berjer Koltuk', sku: 'KOL-002', price: 720.00, selling_price: 720.00 },
    { id: 'prod-3', name: 'Kanepe 2+1', sku: 'KOL-003', price: 2200.00, selling_price: 2200.00 },
  ]

  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (id, name, sku, price, selling_price)
    VALUES (?, ?, ?, ?, ?)
  `)

  products.forEach(p => {
    insertProduct.run(p.id, p.name, p.sku, p.price, p.selling_price || p.price)
  })

  // BOM Reçeteleri
  const bomItems = [
    { id: 'bom-1', product_id: 'prod-1', material_id: 'mat-1', quantity_required: 8.0 }, // Chester: 8m Kumaş
    { id: 'bom-2', product_id: 'prod-1', material_id: 'mat-2', quantity_required: 5.0 }, // Chester: 5kg Sünger
    { id: 'bom-3', product_id: 'prod-2', material_id: 'mat-1', quantity_required: 6.0 }, // Berjer: 6m Kumaş
    { id: 'bom-4', product_id: 'prod-2', material_id: 'mat-2', quantity_required: 4.0 }, // Berjer: 4kg Sünger
  ]

  const insertBOM = db.prepare(`
    INSERT OR IGNORE INTO bom (id, product_id, material_id, quantity_required)
    VALUES (?, ?, ?, ?)
  `)

  bomItems.forEach(b => {
    insertBOM.run(b.id, b.product_id, b.material_id, b.quantity_required)
  })

  // Accounts (Cari Hesaplar)
  const accounts = [
    { id: 'acc-1', code: 'MUS-0001', name: 'Eren Gökşen', type: 'customer', phone: '0532 123 4567', email: 'eren@example.com' },
    { id: 'acc-2', code: 'TED-0001', name: 'Kumaş Tedarik A.Ş.', type: 'supplier', phone: '0212 987 6543', email: 'info@kumas.com' },
  ]

  const insertAccount = db.prepare(`
    INSERT OR IGNORE INTO accounts (id, code, name, type, phone, email)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  accounts.forEach(a => {
    insertAccount.run(a.id, a.code, a.name, a.type, a.phone, a.email)
  })
}
