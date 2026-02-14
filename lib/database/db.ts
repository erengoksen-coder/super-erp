/**
 * Local SQLite Veritabanı
 * Supabase olmadan bilgisayarda çalışır
 */

import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { hashPassword } from '@/lib/auth/password'

export const DEFAULT_COMPANY_ID = 'company_default'
export const DEFAULT_BRANCH_ID = 'branch_default'
const DEFAULT_COMPANY_NAME = 'DefaultCompany'
const DEFAULT_BRANCH_NAME = 'Merkez'
export const DEFAULT_WAREHOUSE_ID = 'warehouse_default'
const DEFAULT_WAREHOUSE_NAME = 'Ana Depo'
const DEFAULT_WAREHOUSE_CODE = 'DEP-001'

// Veritabanı yolu: DATABASE_PATH env (Docker/production) veya proje/data/erp.db
function getDbPath(): string {
  const envPath = process.env.DATABASE_PATH || process.env.DATABASE_URL
  if (envPath) {
    const p = envPath.replace(/^file:/i, '').trim()
    if (p && p !== ':memory:') return p
  }
  return join(process.cwd(), 'data', 'erp.db')
}
const dbPath = getDbPath()
const dataDir = dirname(dbPath)
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

// Veritabanı bağlantısı
let db: Database.Database | null = null

function openDatabase(path: string) {
  const instance = new Database(path)
  try {
    instance.pragma('journal_mode = WAL')
  } catch (error) {
    console.error('Database WAL pragma failed, falling back to DELETE mode:', error)
    try {
      instance.pragma('journal_mode = DELETE')
    } catch (fallbackError) {
      console.error('Database journal_mode fallback failed:', fallbackError)
    }
  }
  instance.pragma('busy_timeout = 5000')
  instance.pragma('foreign_keys = OFF')
  return instance
}

export function getDatabase(): Database.Database {
  if (!db) {
    try {
      db = openDatabase(dbPath)
    } catch (error) {
      // DB dosyası açılamazsa, alternatif konum dene ve sonra in-memory fallback.
      console.error('Database open failed:', error)
      const legacyPath = join(process.cwd(), 'erp.db')
      if (existsSync(legacyPath)) {
        try {
          db = openDatabase(legacyPath)
          console.warn('Database opened from legacy path:', legacyPath)
        } catch (legacyError) {
          console.error('Legacy database open failed, falling back to in-memory DB:', legacyError)
          db = new Database(':memory:')
        }
      } else {
        console.error('Database open failed, falling back to in-memory DB:', error)
        db = new Database(':memory:')
      }
    }
    try {
      initializeDatabase()
    } catch (error) {
      // Init hatası varsa uygulamayı tamamen düşürme, logla ve devam et
      console.error('Database initialize failed:', error)
    }
  }
  return db
}

/**
 * Veritabanı tablolarını oluştur
 */
function initializeDatabase() {
  if (!db) return

  // Companies (Şirketler)
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Branches (Şubeler)
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Varsayılan şirket/şube kayıtları
  try {
    db.prepare('INSERT OR IGNORE INTO companies (id, name) VALUES (?, ?)').run(
      DEFAULT_COMPANY_ID,
      DEFAULT_COMPANY_NAME
    )
    db.prepare('INSERT OR IGNORE INTO branches (id, company_id, name) VALUES (?, ?, ?)').run(
      DEFAULT_BRANCH_ID,
      DEFAULT_COMPANY_ID,
      DEFAULT_BRANCH_NAME
    )
  } catch {}

  // Warehouses (Depolar)
  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    )
  `)

  // Varsayılan depo
  try {
    db.prepare('INSERT OR IGNORE INTO warehouses (id, code, name, company_id, branch_id) VALUES (?, ?, ?, ?, ?)').run(
      DEFAULT_WAREHOUSE_ID,
      DEFAULT_WAREHOUSE_CODE,
      DEFAULT_WAREHOUSE_NAME,
      DEFAULT_COMPANY_ID,
      DEFAULT_BRANCH_ID
    )
  } catch {}

  // Users (Kullanıcılar)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'user',
      position TEXT,
      job_title TEXT,
      is_approved INTEGER DEFAULT 0,
      approved_by TEXT,
      approved_at TEXT,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      last_login TEXT,
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `)

  // User Sessions (Refresh Token Yönetimi)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      refresh_token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      last_used_at TEXT,
      user_agent TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  // Push Subscriptions
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Position kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE users ADD COLUMN position TEXT')
  } catch {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}'`)
  } catch {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}'`)
  } catch {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN deleted_at TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN last_activity TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN is_locked INTEGER DEFAULT 0')
  } catch {}
  try {
    db.exec('ALTER TABLE users ADD COLUMN dealer_name TEXT')
  } catch {}
  try {
    db.exec(`
      UPDATE users
      SET company_id = '${DEFAULT_COMPANY_ID}'
      WHERE company_id IS NULL OR TRIM(company_id) = ''
    `)
  } catch {}
  try {
    db.exec(`
      UPDATE users
      SET branch_id = '${DEFAULT_BRANCH_ID}'
      WHERE branch_id IS NULL OR TRIM(branch_id) = ''
    `)
  } catch {}

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
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, page_path)
    )
  `)
  try {
    db.exec(`ALTER TABLE user_permissions ADD COLUMN company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}'`)
  } catch {}
  try {
    db.exec(`ALTER TABLE user_permissions ADD COLUMN branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}'`)
  } catch {}
  try {
    db.exec(`
      UPDATE user_permissions
      SET company_id = '${DEFAULT_COMPANY_ID}'
      WHERE company_id IS NULL OR TRIM(company_id) = ''
    `)
  } catch {}
  try {
    db.exec(`
      UPDATE user_permissions
      SET branch_id = '${DEFAULT_BRANCH_ID}'
      WHERE branch_id IS NULL OR TRIM(branch_id) = ''
    `)
  } catch {}

  // Audit Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      action TEXT NOT NULL,
      record_id TEXT,
      user_id TEXT,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      before_data TEXT,
      after_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  try {
    db.exec('ALTER TABLE audit_logs ADD COLUMN old_data TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE audit_logs ADD COLUMN new_data TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE audit_logs ADD COLUMN ip_address TEXT')
  } catch {}

  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id)')
  } catch {}
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)')
  } catch {}

  // Active views for soft deletes
  try {
    db.exec('CREATE VIEW IF NOT EXISTS active_orders AS SELECT * FROM orders WHERE deleted_at IS NULL')
  } catch {}
  try {
    db.exec('CREATE VIEW IF NOT EXISTS active_products AS SELECT * FROM products WHERE deleted_at IS NULL')
  } catch {}

  // Unit Conversions (Birim çevrimleri)
  db.exec(`
    CREATE TABLE IF NOT EXISTS unit_conversions (
      id TEXT PRIMARY KEY,
      material_id TEXT,
      from_unit TEXT NOT NULL,
      to_unit TEXT NOT NULL,
      factor REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      UNIQUE(material_id, from_unit, to_unit)
    )
  `)
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_unit_conversions_material ON unit_conversions(material_id)')
  } catch {}
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_unit_conversions_units ON unit_conversions(from_unit, to_unit)')
  } catch {}
  try {
    db.exec('ALTER TABLE unit_conversions ADD COLUMN deleted_at TEXT')
  } catch {}

  // Roles (RBAC)
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Permissions (RBAC)
  db.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Role Permissions (RBAC)
  db.exec(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL,
      permission_key TEXT NOT NULL,
      can_view INTEGER DEFAULT 1,
      can_create INTEGER DEFAULT 0,
      can_edit INTEGER DEFAULT 0,
      can_delete INTEGER DEFAULT 0,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(role_id, permission_key)
    )
  `)

  // User Roles (RBAC)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, role_id)
    )
  `)

  // Varsayılan roller
  try {
    db.prepare('INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)').run(
      'role_admin',
      'admin',
      'System administrator'
    )
    db.prepare('INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)').run(
      'role_user',
      'user',
      'Standard user'
    )
    db.prepare('INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)').run(
      'role_bayi',
      'bayi',
      'Bayi portal kullanıcısı (sadece kendi cari verileri)'
    )
  } catch {}

  // Mevcut kullanıcıları role ile eşle
  try {
    const users = db.prepare('SELECT id, role FROM users').all() as Array<{ id: string; role?: string | null }>
    for (const user of users) {
      const rawRole = (user.role || 'user').toString().trim().toLowerCase()
      const normalized = rawRole === 'admin' || rawRole === 'yönetici' || rawRole === 'yonetici'
        ? 'admin'
        : rawRole || 'user'
      const roleId = normalized === 'admin' ? 'role_admin' : normalized === 'user' ? 'role_user' : `role_${normalized.replace(/[^a-z0-9_]+/g, '_')}`
      db.prepare('INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)').run(
        roleId,
        normalized,
        null
      )
      db.prepare('INSERT OR IGNORE INTO user_roles (id, user_id, role_id) VALUES (?, ?, ?)').run(
        `ur_${user.id}_${roleId}`,
        user.id,
        roleId
      )
    }
  } catch {}

  // Admin kullanıcı izinlerinden role_permissions üret (boşsa)
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM role_permissions').get() as { count?: number }
    if (!count?.count) {
      const adminPerms = db.prepare(`
        SELECT up.page_path, up.can_view, up.can_create, up.can_edit, up.can_delete
        FROM user_permissions up
        JOIN users u ON u.id = up.user_id
        WHERE u.role IN ('admin', 'yönetici', 'yonetici')
      `).all() as Array<{
        page_path: string
        can_view: number
        can_create: number
        can_edit: number
        can_delete: number
      }>

      const insertPermission = db.prepare(`
        INSERT OR IGNORE INTO permissions (key, name, category, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?)
      `)
      const insertRolePermission = db.prepare(`
        INSERT OR IGNORE INTO role_permissions
        (id, role_id, permission_key, can_view, can_create, can_edit, can_delete, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const perm of adminPerms) {
        const key = perm.page_path
        const permId = `rp_role_admin_${String(key).replace(/[^a-zA-Z0-9_]+/g, '_')}`
        insertPermission.run(key, key, null, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)
        insertRolePermission.run(
          permId,
          'role_admin',
          key,
          perm.can_view ?? 0,
          perm.can_create ?? 0,
          perm.can_edit ?? 0,
          perm.can_delete ?? 0,
          DEFAULT_COMPANY_ID,
          DEFAULT_BRANCH_ID
        )
      }
    }
  } catch {}

  // Satış/Satın Alma siparişleri için varsayılan izinleri kopyala
  try {
    const targetPaths = ['/sales-orders', '/purchase-orders']
    const permissionInsert = db.prepare(`
      INSERT OR IGNORE INTO permissions (key, name, category, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?)
    `)
    const rolePermInsert = db.prepare(`
      INSERT OR IGNORE INTO role_permissions
      (id, role_id, permission_key, can_view, can_create, can_edit, can_delete, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const userPermInsert = db.prepare(`
      INSERT OR IGNORE INTO user_permissions
      (id, user_id, page_path, can_view, can_create, can_edit, can_delete, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const path of targetPaths) {
      permissionInsert.run(path, path, null, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)
    }

    const baseRolePerms = db.prepare(`
      SELECT role_id, can_view, can_create, can_edit, can_delete
      FROM role_permissions
      WHERE permission_key = '/orders'
    `).all() as Array<{
      role_id: string
      can_view: number
      can_create: number
      can_edit: number
      can_delete: number
    }>

    for (const perm of baseRolePerms) {
      for (const path of targetPaths) {
        const permId = `rp_${perm.role_id}_${path.replace(/[^a-zA-Z0-9_]+/g, '_')}`
        rolePermInsert.run(
          permId,
          perm.role_id,
          path,
          perm.can_view ?? 0,
          perm.can_create ?? 0,
          perm.can_edit ?? 0,
          perm.can_delete ?? 0,
          DEFAULT_COMPANY_ID,
          DEFAULT_BRANCH_ID
        )
      }
    }

    const baseUserPerms = db.prepare(`
      SELECT user_id, can_view, can_create, can_edit, can_delete
      FROM user_permissions
      WHERE page_path = '/orders'
    `).all() as Array<{
      user_id: string
      can_view: number
      can_create: number
      can_edit: number
      can_delete: number
    }>

    for (const perm of baseUserPerms) {
      for (const path of targetPaths) {
        const permId = `up_${perm.user_id}_${path.replace(/[^a-zA-Z0-9_]+/g, '_')}`
        userPermInsert.run(
          permId,
          perm.user_id,
          path,
          perm.can_view ?? 0,
          perm.can_create ?? 0,
          perm.can_edit ?? 0,
          perm.can_delete ?? 0,
          DEFAULT_COMPANY_ID,
          DEFAULT_BRANCH_ID
        )
      }
    }
  } catch {}

  // Yeni modüller için admin rolüne varsayılan izin ver
  try {
    const adminPaths = ['/accounting', '/hr', '/crm', '/fixed-assets', '/procurement', '/dashboard']
    const permissionInsert = db.prepare(`
      INSERT OR IGNORE INTO permissions (key, name, category, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?)
    `)
    const rolePermInsert = db.prepare(`
      INSERT OR IGNORE INTO role_permissions
      (id, role_id, permission_key, can_view, can_create, can_edit, can_delete, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const path of adminPaths) {
      permissionInsert.run(path, path, null, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)
      const permId = `rp_role_admin_${path.replace(/[^a-zA-Z0-9_]+/g, '_')}`
      rolePermInsert.run(
        permId,
        'role_admin',
        path,
        1,
        1,
        1,
        1,
        DEFAULT_COMPANY_ID,
        DEFAULT_BRANCH_ID
      )
    }
  } catch {}

  // Materials (Hammaddeler)
  db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      category TEXT,
      unit TEXT NOT NULL,
      stock_amount REAL DEFAULT 0,
      reserved_quantity REAL DEFAULT 0,
      min_stock_level REAL DEFAULT 0,
      purchase_price REAL DEFAULT 0,
      supplier_id TEXT,
      last_purchase_date TEXT,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      version INTEGER DEFAULT 0,
      deleted_at TEXT,
      FOREIGN KEY (supplier_id) REFERENCES accounts(id)
    )
  `)
  try { db.exec('ALTER TABLE materials ADD COLUMN reserved_quantity REAL DEFAULT 0') } catch {}
  try { db.exec('ALTER TABLE materials ADD COLUMN version INTEGER DEFAULT 0') } catch {}

  // Material Stocks (Depo bazlı stok)
  db.exec(`
    CREATE TABLE IF NOT EXISTS material_stocks (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      warehouse_id TEXT NOT NULL,
      quantity REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(material_id, warehouse_id),
      FOREIGN KEY (material_id) REFERENCES materials(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    )
  `)

  // Material Prices (Tarihsel fiyatlar)
  db.exec(`
    CREATE TABLE IF NOT EXISTS material_prices (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      price REAL NOT NULL,
      price_type TEXT DEFAULT 'purchase',
      source_type TEXT,
      source_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_material_prices_material ON material_prices(material_id)') } catch {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_material_prices_created_at ON material_prices(created_at)') } catch {}

  // Production Costs (Üretim maliyetleri)
  db.exec(`
    CREATE TABLE IF NOT EXISTS production_costs (
      id TEXT PRIMARY KEY,
      production_order_id TEXT NOT NULL,
      material_cost REAL DEFAULT 0,
      labor_cost REAL DEFAULT 0,
      overhead_cost REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_production_costs_order ON production_costs(production_order_id)') } catch {}

  // Stock Alerts (Kritik stok uyarıları)
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_alerts (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      level TEXT DEFAULT 'critical',
      message TEXT,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      deleted_at TEXT,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_stock_alerts_material ON stock_alerts(material_id)') } catch {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_stock_alerts_status ON stock_alerts(status)') } catch {}
  // Material Reservations (Rezervasyonlar)
  db.exec(`
    CREATE TABLE IF NOT EXISTS material_reservations (
      id TEXT PRIMARY KEY,
      material_id TEXT NOT NULL,
      customer_id TEXT,
      reference_type TEXT,
      reference_id TEXT,
      quantity REAL NOT NULL,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (material_id) REFERENCES materials(id),
      FOREIGN KEY (customer_id) REFERENCES accounts(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_material_reservations_material ON material_reservations(material_id)') } catch {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_material_reservations_customer ON material_reservations(customer_id)') } catch {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_material_reservations_status ON material_reservations(status)') } catch {}

  // Materials tablosuna purchase_price kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE materials ADD COLUMN purchase_price REAL DEFAULT 0')
  } catch {}
  // Materials tablosuna code ve category kolonları ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE materials ADD COLUMN code TEXT UNIQUE')
  } catch {}
  try {
    db.exec(`ALTER TABLE materials ADD COLUMN company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}'`)
  } catch {}
  try {
    db.exec(`ALTER TABLE materials ADD COLUMN branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}'`)
  } catch {}
  try {
    db.exec('ALTER TABLE materials ADD COLUMN deleted_at TEXT')
  } catch {}
  try {
    db.exec(`
      UPDATE materials
      SET company_id = '${DEFAULT_COMPANY_ID}'
      WHERE company_id IS NULL OR TRIM(company_id) = ''
    `)
  } catch {}
  try {
    db.exec(`
      UPDATE materials
      SET branch_id = '${DEFAULT_BRANCH_ID}'
      WHERE branch_id IS NULL OR TRIM(branch_id) = ''
    `)
  } catch {}

  // İlk kurulumda depo stoklarını mevcut stoklardan oluştur
  try {
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM material_stocks').get() as { count?: number }
    if (!existingCount?.count) {
      const materials = db.prepare('SELECT id, stock_amount FROM materials').all() as Array<{ id: string; stock_amount: number | null }>
      const insertStock = db.prepare(`
        INSERT OR IGNORE INTO material_stocks (id, material_id, warehouse_id, quantity)
        VALUES (?, ?, ?, ?)
      `)
      for (const material of materials) {
        insertStock.run(
          `ms_${material.id}_${DEFAULT_WAREHOUSE_ID}`,
          material.id,
          DEFAULT_WAREHOUSE_ID,
          material.stock_amount || 0
        )
      }
    }
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
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
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
  try {
    db.exec(`ALTER TABLE products ADD COLUMN company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}'`)
  } catch {}
  try {
    db.exec(`ALTER TABLE products ADD COLUMN branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}'`)
  } catch {}
  try {
    db.exec('ALTER TABLE products ADD COLUMN deleted_at TEXT')
  } catch {}
  try {
    db.exec(`
      UPDATE products
      SET company_id = '${DEFAULT_COMPANY_ID}'
      WHERE company_id IS NULL OR TRIM(company_id) = ''
    `)
  } catch {}
  try {
    db.exec(`
      UPDATE products
      SET branch_id = '${DEFAULT_BRANCH_ID}'
      WHERE branch_id IS NULL OR TRIM(branch_id) = ''
    `)
  } catch {}
  
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
      actual_usage REAL,
      fire_quantity REAL,
      variance REAL,
      variance_percentage REAL,
      scrap_reason TEXT,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id),
      UNIQUE(production_order_id, material_id)
    )
  `)
  try { db.exec('ALTER TABLE production_actual_consumption ADD COLUMN actual_usage REAL') } catch {}
  try { db.exec('ALTER TABLE production_actual_consumption ADD COLUMN scrap_reason TEXT') } catch {}

  // Operasyonlar
  db.exec(`
    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      standard_duration_minutes INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    )
  `)

  // İstasyonlar / Work Centers
  db.exec(`
    CREATE TABLE IF NOT EXISTS work_centers (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      location TEXT,
      capacity INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    )
  `)

  // HR (İK) taban şeması
  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_employees (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      manager_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_departments_name ON hr_departments(name)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department_id TEXT,
      leader_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (department_id) REFERENCES hr_departments(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_teams_department ON hr_teams(department_id)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_workplaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      country TEXT,
      timezone TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_workplaces_name ON hr_workplaces(name)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_employee_profiles (
      id TEXT PRIMARY KEY,
      employee_id TEXT UNIQUE NOT NULL,
      department_id TEXT,
      team_id TEXT,
      workplace_id TEXT,
      title TEXT,
      employment_type TEXT,
      start_date TEXT,
      end_date TEXT,
      manager_id TEXT,
      base_salary REAL DEFAULT 0,
      salary_currency TEXT DEFAULT 'TRY',
      payroll_type TEXT DEFAULT 'monthly',
      bank_iban TEXT,
      national_id TEXT,
      birth_date TEXT,
      address TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      annual_leave_days REAL DEFAULT 14,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (employee_id) REFERENCES hr_employees(id),
      FOREIGN KEY (department_id) REFERENCES hr_departments(id),
      FOREIGN KEY (team_id) REFERENCES hr_teams(id),
      FOREIGN KEY (workplace_id) REFERENCES hr_workplaces(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_employee_profiles_employee ON hr_employee_profiles(employee_id)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_contracts (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      contract_type TEXT,
      start_date TEXT,
      end_date TEXT,
      work_hours_per_week REAL DEFAULT 45,
      probation_end_date TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_contracts_employee ON hr_contracts(employee_id)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_compensation (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      effective_from TEXT,
      effective_to TEXT,
      base_salary REAL DEFAULT 0,
      salary_currency TEXT DEFAULT 'TRY',
      bonus REAL DEFAULT 0,
      allowance REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_compensation_employee ON hr_compensation(employee_id)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_custom_fields (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      field_key TEXT NOT NULL,
      field_value TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      UNIQUE(employee_id, field_key),
      FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_custom_fields_employee ON hr_custom_fields(employee_id)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_timeoff_balances (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      annual_entitlement REAL DEFAULT 0,
      carried_over REAL DEFAULT 0,
      used REAL DEFAULT 0,
      remaining REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      UNIQUE(employee_id, year),
      FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_timeoff_balances_employee_year ON hr_timeoff_balances(employee_id, year)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_timeoff_requests (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_days REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      reason TEXT,
      notes TEXT,
      approver_id TEXT,
      approved_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_timeoff_requests_employee ON hr_timeoff_requests(employee_id)') } catch {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_timeoff_requests_status ON hr_timeoff_requests(status)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_attendance (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      break_minutes INTEGER DEFAULT 0,
      total_minutes INTEGER DEFAULT 0,
      expected_minutes INTEGER DEFAULT 600,
      absence_minutes INTEGER DEFAULT 0,
      overtime_minutes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'present',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      UNIQUE(employee_id, date),
      FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_attendance_employee_date ON hr_attendance(employee_id, date)') } catch {}
  try { db.exec('ALTER TABLE hr_attendance ADD COLUMN workplace_id TEXT') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_payrolls (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      base_gross REAL DEFAULT 0,
      gross_earnings REAL DEFAULT 0,
      total_deductions REAL DEFAULT 0,
      net_pay REAL DEFAULT 0,
      currency TEXT DEFAULT 'TRY',
      status TEXT DEFAULT 'draft',
      issued_at TEXT,
      paid_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
    )
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_payroll_items (
      id TEXT PRIMARY KEY,
      payroll_id TEXT NOT NULL,
      type TEXT NOT NULL,
      code TEXT,
      description TEXT,
      amount REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (payroll_id) REFERENCES hr_payrolls(id) ON DELETE CASCADE
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_payrolls_employee_period ON hr_payrolls(employee_id, period_start, period_end)') } catch {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_payroll_items_payroll_id ON hr_payroll_items(payroll_id)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_holidays (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      name TEXT NOT NULL,
      is_working_day INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      UNIQUE(date, name)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_holidays_date ON hr_holidays(date)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_shift_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      break_minutes INTEGER DEFAULT 0,
      working_days TEXT DEFAULT '1,2,3,4,5',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_shift_templates_name ON hr_shift_templates(name)') } catch {}
  try { db.exec('ALTER TABLE hr_employee_profiles ADD COLUMN shift_template_id TEXT REFERENCES hr_shift_templates(id)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_performance_goals (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_value TEXT,
      current_value TEXT,
      period_start TEXT,
      period_end TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_performance_goals_employee ON hr_performance_goals(employee_id)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_performance_reviews (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      reviewer_id TEXT,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      rating REAL,
      comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (employee_id) REFERENCES hr_employees(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_performance_reviews_employee ON hr_performance_reviews(employee_id)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_job_openings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      department_id TEXT,
      location TEXT,
      description TEXT,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (department_id) REFERENCES hr_departments(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_job_openings_status ON hr_job_openings(status)') } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS hr_job_candidates (
      id TEXT PRIMARY KEY,
      job_opening_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      status TEXT DEFAULT 'applied',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (job_opening_id) REFERENCES hr_job_openings(id)
    )
  `)
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_hr_job_candidates_job ON hr_job_candidates(job_opening_id)') } catch {}

  // Üretim emri operasyonları
  db.exec(`
    CREATE TABLE IF NOT EXISTS production_order_operations (
      id TEXT PRIMARY KEY,
      production_order_id TEXT NOT NULL,
      operation_id TEXT NOT NULL,
      work_center_id TEXT,
      personnel_id TEXT,
      planned_start TEXT,
      planned_end TEXT,
      actual_start TEXT,
      actual_end TEXT,
      planned_duration_minutes INTEGER DEFAULT 0,
      actual_duration_minutes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'planned',
      delay_reason TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (operation_id) REFERENCES operations(id),
      FOREIGN KEY (work_center_id) REFERENCES work_centers(id),
      FOREIGN KEY (personnel_id) REFERENCES hr_employees(id),
      UNIQUE(production_order_id, operation_id)
    )
  `)

  // BOM Versiyonları
  db.exec(`
    CREATE TABLE IF NOT EXISTS bom_versions (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      version_no INTEGER NOT NULL,
      effective_date TEXT NOT NULL,
      revision_reason TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      UNIQUE(product_id, version_no),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `)

  // BOM (Ürün Reçetesi)
  try {
    const bomColumns = db.prepare('PRAGMA table_info(bom)').all() as Array<{ name: string }>
    const hasVersion = bomColumns.some((col) => col.name === 'version_id')
    if (!hasVersion) {
      const existingBom = db.prepare('SELECT * FROM bom').all() as any[]
      db.exec('DROP TABLE IF EXISTS bom_backup')
      db.exec('CREATE TABLE bom_backup AS SELECT * FROM bom')
      db.exec('DROP TABLE bom')

      db.exec(`
        CREATE TABLE bom (
          id TEXT PRIMARY KEY,
          version_id TEXT,
          product_id TEXT NOT NULL,
          material_id TEXT NOT NULL,
          parent_id TEXT,
          quantity_required REAL NOT NULL,
          unit TEXT,
          fire_percentage REAL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
        )
      `)

      if (existingBom.length > 0) {
        const insertBom = db.prepare(`
          INSERT INTO bom
          (id, product_id, material_id, parent_id, quantity_required, unit, fire_percentage, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        for (const row of existingBom) {
          insertBom.run(
            row.id,
            row.product_id,
            row.material_id,
            row.parent_id || null,
            row.quantity_required,
            row.unit || null,
            row.fire_percentage ?? 0,
            row.created_at || new Date().toISOString(),
            row.updated_at || new Date().toISOString()
          )
        }
      }
      db.exec('DROP TABLE IF EXISTS bom_backup')
    }
  } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS bom (
      id TEXT PRIMARY KEY,
      version_id TEXT,
      product_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      parent_id TEXT,
      quantity_required REAL NOT NULL,
      unit TEXT,
      fire_percentage REAL DEFAULT 0,
      waste_percentage REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    )
  `)
  try { db.exec('ALTER TABLE bom ADD COLUMN version_id TEXT') } catch {}
  try { db.exec('ALTER TABLE bom ADD COLUMN parent_id TEXT') } catch {}
  try { db.exec('ALTER TABLE bom ADD COLUMN deleted_at TEXT') } catch {}
  try { db.exec('ALTER TABLE bom ADD COLUMN unit TEXT') } catch {}
  try { db.exec('ALTER TABLE bom ADD COLUMN waste_percentage REAL DEFAULT 0') } catch {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_bom_parent_id ON bom(parent_id)') } catch {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_bom_version_id ON bom(version_id)') } catch {}
  try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS uniq_bom_version_item ON bom(version_id, product_id, material_id, parent_id)') } catch {}
  try {
    db.exec(`
      UPDATE bom
      SET unit = (SELECT unit FROM materials WHERE materials.id = bom.material_id)
      WHERE unit IS NULL OR unit = ''
    `)
  } catch {}

  // BOM versiyonlarını seed et (mevcut BOM'lar için)
  try {
    const productsWithBom = db.prepare('SELECT DISTINCT product_id FROM bom').all() as Array<{ product_id: string }>
    const insertVersion = db.prepare(`
      INSERT OR IGNORE INTO bom_versions
      (id, product_id, version_no, effective_date, revision_reason, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `)
    const updateBomVersion = db.prepare(`
      UPDATE bom
      SET version_id = ?
      WHERE product_id = ? AND (version_id IS NULL OR TRIM(version_id) = '')
    `)
    const today = new Date().toISOString().split('T')[0]
    for (const row of productsWithBom) {
      const existingVersion = db.prepare(`
        SELECT id FROM bom_versions
        WHERE product_id = ? AND version_no = 1
      `).get(row.product_id) as { id: string } | undefined
      const versionId = existingVersion?.id || `bomv_${row.product_id}_v1`
      insertVersion.run(versionId, row.product_id, 1, today, 'İlk versiyon')
      updateBomVersion.run(versionId, row.product_id)
    }
  } catch {}

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
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)

  // Work Orders (Is Emirleri)
  db.exec(`
    CREATE TABLE IF NOT EXISTS work_orders (
      id TEXT PRIMARY KEY,
      production_order_id TEXT NOT NULL,
      work_order_number TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'open',
      planned_start_date TEXT,
      planned_end_date TEXT,
      notes TEXT,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      UNIQUE(production_order_id),
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE
    )
  `)

  // Work Order Operations (Operasyon Takibi)
  db.exec(`
    CREATE TABLE IF NOT EXISTS work_order_operations (
      id TEXT PRIMARY KEY,
      work_order_id TEXT NOT NULL,
      station TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      sequence INTEGER DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
      UNIQUE(work_order_id, station)
    )
  `)
  try { db.exec('ALTER TABLE work_orders ADD COLUMN planned_start_date TEXT') } catch {}
  try { db.exec('ALTER TABLE work_orders ADD COLUMN planned_end_date TEXT') } catch {}
  try { db.exec('ALTER TABLE work_orders ADD COLUMN notes TEXT') } catch {}
  try { db.exec('ALTER TABLE work_orders ADD COLUMN status TEXT DEFAULT "open"') } catch {}
  try { db.exec(`ALTER TABLE work_orders ADD COLUMN company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}'`) } catch {}
  try { db.exec(`ALTER TABLE work_orders ADD COLUMN branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}'`) } catch {}
  try { db.exec('ALTER TABLE work_orders ADD COLUMN deleted_at TEXT') } catch {}
  try { db.exec('ALTER TABLE work_order_operations ADD COLUMN sequence INTEGER DEFAULT 0') } catch {}
  try { db.exec('ALTER TABLE work_order_operations ADD COLUMN notes TEXT') } catch {}
  
  // İstasyon kolonları ekle
  try { db.exec('ALTER TABLE production_orders ADD COLUMN current_station TEXT DEFAULT "iskelet"') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN iskelet_started_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN iskelet_completed_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN terzihane_started_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN terzihane_completed_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN berjer_started_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN berjer_completed_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN döseme_started_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN döseme_completed_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN montaj_started_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN montaj_completed_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN sevkiyat_started_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN sevkiyat_completed_at TEXT') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN stock_deducted INTEGER DEFAULT 0') } catch {}
  try { db.exec(`ALTER TABLE production_orders ADD COLUMN company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}'`) } catch {}
  try { db.exec(`ALTER TABLE production_orders ADD COLUMN branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}'`) } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN deleted_at TEXT') } catch {}
  try {
    db.exec(`
      UPDATE production_orders
      SET company_id = '${DEFAULT_COMPANY_ID}'
      WHERE company_id IS NULL OR TRIM(company_id) = ''
    `)
  } catch {}
  try {
    db.exec(`
      UPDATE production_orders
      SET branch_id = '${DEFAULT_BRANCH_ID}'
      WHERE branch_id IS NULL OR TRIM(branch_id) = ''
    `)
  } catch {}
  
  // Her istasyon için tamamlanan adet sayacı ekle
  try { db.exec('ALTER TABLE production_orders ADD COLUMN iskelet_completed_count INTEGER DEFAULT 0') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN terzihane_completed_count INTEGER DEFAULT 0') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN berjer_completed_count INTEGER DEFAULT 0') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN döseme_completed_count INTEGER DEFAULT 0') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN montaj_completed_count INTEGER DEFAULT 0') } catch {}
  try { db.exec('ALTER TABLE production_orders ADD COLUMN sevkiyat_completed_count INTEGER DEFAULT 0') } catch {}

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
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      warehouse_id TEXT,
      from_warehouse_id TEXT,
      to_warehouse_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
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
  try {
    db.exec(`ALTER TABLE stock_movements ADD COLUMN company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}'`)
  } catch {}
  try {
    db.exec(`ALTER TABLE stock_movements ADD COLUMN branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}'`)
  } catch {}
  try {
    db.exec('ALTER TABLE stock_movements ADD COLUMN warehouse_id TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE stock_movements ADD COLUMN from_warehouse_id TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE stock_movements ADD COLUMN to_warehouse_id TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE stock_movements ADD COLUMN deleted_at TEXT')
  } catch {}
  try {
    db.exec(`
      UPDATE stock_movements
      SET company_id = '${DEFAULT_COMPANY_ID}'
      WHERE company_id IS NULL OR TRIM(company_id) = ''
    `)
  } catch {}
  try {
    db.exec(`
      UPDATE stock_movements
      SET branch_id = '${DEFAULT_BRANCH_ID}'
      WHERE branch_id IS NULL OR TRIM(branch_id) = ''
    `)
  } catch {}
  
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
          company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
          branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
          warehouse_id TEXT,
          from_warehouse_id TEXT,
          to_warehouse_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT,
          FOREIGN KEY (material_id) REFERENCES materials(id),
          FOREIGN KEY (product_id) REFERENCES products(id),
          CHECK ((material_id IS NOT NULL) OR (product_id IS NOT NULL))
        )
      `)
      
      // Verileri geri yükle
      const insertStmt = db.prepare(`
        INSERT INTO stock_movements 
        (id, material_id, product_id, movement_type, quantity, reference_type, reference_id, invoice_number, shipment_number, notes, company_id, branch_id, warehouse_id, from_warehouse_id, to_warehouse_id, created_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          row.invoice_number || null,
          row.shipment_number || null,
          row.notes || null,
          row.company_id || DEFAULT_COMPANY_ID,
          row.branch_id || DEFAULT_BRANCH_ID,
          row.created_at || new Date().toISOString(),
          row.deleted_at || null
        )
      }
      
      // Yedek tabloyu sil
      db.exec('DROP TABLE IF EXISTS stock_movements_backup')
    }
  } catch (e: any) {
    // Hata durumunda sessizce devam et
    console.warn('stock_movements tablosu güncellenirken hata:', e.message)
  }
  
  // user_id kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE stock_movements ADD COLUMN user_id TEXT')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('user_id kolonu eklenirken hata:', e.message)
    }
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
          company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
          branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
          warehouse_id TEXT,
          from_warehouse_id TEXT,
          to_warehouse_id TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT,
          FOREIGN KEY (material_id) REFERENCES materials(id),
          FOREIGN KEY (product_id) REFERENCES products(id),
          CHECK ((material_id IS NOT NULL) OR (product_id IS NOT NULL))
        )
      `)
      
      // Verileri geri yükle
      const insertStmt = db.prepare(`
        INSERT INTO stock_movements 
        (id, material_id, product_id, movement_type, quantity, reference_type, reference_id, invoice_number, shipment_number, notes, company_id, branch_id, warehouse_id, from_warehouse_id, to_warehouse_id, created_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      for (const row of oldData as any[]) {
        insertStmt.run(
          row.id,
          row.material_id,
          row.product_id || null,
          row.movement_type,
          row.quantity,
          row.reference_type,
          row.reference_id,
          row.invoice_number || null,
          row.shipment_number || null,
          row.notes,
          row.company_id || DEFAULT_COMPANY_ID,
          row.branch_id || DEFAULT_BRANCH_ID,
          row.warehouse_id || null,
          row.from_warehouse_id || null,
          row.to_warehouse_id || null,
          row.created_at,
          row.deleted_at || null
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

  // Orders (Siparişler) - Excel'den yüklenen siparişler
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE,
      dealer_name TEXT, -- CARİ ADI (Bayi Adı)
      customer_name TEXT, -- MÜŞTERİ ADI (Satın Alan Müşteri)
      customer_code TEXT,
      product_name TEXT,
      product_sku TEXT,
      product_id TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL,
      total_amount REAL,
      order_date TEXT, -- SİP TRH (Sipariş Tarihi)
      delivery_date TEXT, -- Teslim Tarihi
      status TEXT DEFAULT 'pending', -- 'pending', 'in_production', 'completed', 'cancelled'
      production_order_id TEXT,
      configuration TEXT, -- KONFİGÜRASYON
      notes TEXT,
      cancel_reason TEXT,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      excel_row_number INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id)
    )
  `)

  // Orders tablosuna dealer_name kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE orders ADD COLUMN dealer_name TEXT')
  } catch {}
  // Orders tablosuna configuration kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE orders ADD COLUMN configuration TEXT')
  } catch {}
  // Orders tablosuna order_date kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE orders ADD COLUMN order_date TEXT')
  } catch {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}'`)
  } catch {}
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}'`)
  } catch {}
  // Orders tablosuna cancel_reason kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE orders ADD COLUMN cancel_reason TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE orders ADD COLUMN deleted_at TEXT')
  } catch {}
  try {
    db.exec(`
      UPDATE orders
      SET company_id = '${DEFAULT_COMPANY_ID}'
      WHERE company_id IS NULL OR TRIM(company_id) = ''
    `)
  } catch {}
  try {
    db.exec(`
      UPDATE orders
      SET branch_id = '${DEFAULT_BRANCH_ID}'
      WHERE branch_id IS NULL OR TRIM(branch_id) = ''
    `)
  } catch {}

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
      supplier_name TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `)

  // Purchase Requests tablosuna supplier_name kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE purchase_requests ADD COLUMN supplier_name TEXT')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('supplier_name kolonu eklenirken hata:', e.message)
    }
  }

  // Purchase Requests tablosuna received_quantity kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE purchase_requests ADD COLUMN received_quantity REAL DEFAULT 0')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('received_quantity kolonu eklenirken hata:', e.message)
    }
  }
  try {
    db.exec('ALTER TABLE purchase_requests ADD COLUMN deleted_at TEXT')
  } catch {}

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
  
  // current_station kolonu ekle (eğer yoksa) - Her barkod için ayrı istasyon takibi
  try {
    db.exec('ALTER TABLE product_serial_numbers ADD COLUMN current_station TEXT')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column') && !e.message?.includes('no such column')) {
      console.warn('current_station kolonu eklenirken hata:', e.message)
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
  // FOREIGN KEY constraint'leri kaldırıldı çünkü NULL değerler için sorun çıkarıyor
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
      risk_limit REAL DEFAULT 0,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      created_by TEXT,
      updated_by TEXT
    )
  `)
  
  // Eğer FOREIGN KEY constraint'leri varsa kaldır (ALTER TABLE ile kaldırılamaz, tablo yeniden oluşturulmalı)
  // Ancak mevcut verileri korumak için constraint'leri sadece yeni tablolarda uygulamıyoruz

  // Accounts tablosuna created_by ve updated_by kolonları ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE accounts ADD COLUMN created_by TEXT')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column') && !e.message?.includes('no such column')) {
      console.warn('created_by kolonu eklenirken hata:', e.message)
    }
  }
  try {
    db.exec('ALTER TABLE accounts ADD COLUMN updated_by TEXT')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column') && !e.message?.includes('no such column')) {
      console.warn('updated_by kolonu eklenirken hata:', e.message)
    }
  }
  try {
    db.exec(`ALTER TABLE accounts ADD COLUMN company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}'`)
  } catch {}
  try {
    db.exec(`ALTER TABLE accounts ADD COLUMN branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}'`)
  } catch {}
  try {
    db.exec('ALTER TABLE accounts ADD COLUMN risk_limit REAL DEFAULT 0')
  } catch {}
  try {
    db.exec('ALTER TABLE accounts ADD COLUMN deleted_at TEXT')
  } catch {}
  
  // Accounts tablosuna discount_rate kolonu ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE accounts ADD COLUMN discount_rate REAL DEFAULT 0')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('discount_rate kolonu eklenirken hata:', e.message)
    }
  }
  
  // Accounts tablosuna yetkili kişi kolonları ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE accounts ADD COLUMN authorized_person_name TEXT')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('authorized_person_name kolonu eklenirken hata:', e.message)
    }
  }
  
  try {
    db.exec('ALTER TABLE accounts ADD COLUMN authorized_person_phone TEXT')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('authorized_person_phone kolonu eklenirken hata:', e.message)
    }
  }
  
  try {
    db.exec(`
      UPDATE accounts
      SET company_id = '${DEFAULT_COMPANY_ID}'
      WHERE company_id IS NULL OR TRIM(company_id) = ''
    `)
  } catch {}
  try {
    db.exec(`
      UPDATE accounts
      SET branch_id = '${DEFAULT_BRANCH_ID}'
      WHERE branch_id IS NULL OR TRIM(branch_id) = ''
    `)
  } catch {}
  
  // Mevcut FOREIGN KEY constraint'lerini kaldırmak için tabloyu yeniden oluştur
  // (SQLite'da ALTER TABLE ile FOREIGN KEY kaldırılamaz)
  try {
    // Önce mevcut verileri yedekle
    const existingAccounts = db.prepare('SELECT * FROM accounts').all() as any[]
    
    // Tabloyu sil ve yeniden oluştur (FOREIGN KEY olmadan)
    db.exec('DROP TABLE IF EXISTS accounts_backup')
    db.exec('CREATE TABLE accounts_backup AS SELECT * FROM accounts')
    db.exec('DROP TABLE accounts')
    
    // Yeni tabloyu oluştur (FOREIGN KEY constraint'leri olmadan)
    db.exec(`
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'customer',
        tax_number TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        balance REAL DEFAULT 0,
        risk_limit REAL DEFAULT 0,
        company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
        branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        created_by TEXT,
        updated_by TEXT
      )
    `)
    
    // Verileri geri yükle
    if (existingAccounts.length > 0) {
      const insert = db.prepare(`
        INSERT INTO accounts (id, code, name, type, tax_number, phone, email, address, balance, risk_limit, company_id, branch_id, created_at, updated_at, deleted_at, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      for (const account of existingAccounts) {
        insert.run(
          account.id,
          account.code,
          account.name,
          account.type,
          account.tax_number,
          account.phone,
          account.email,
          account.address,
          account.balance,
          account.risk_limit || 0,
          account.company_id || DEFAULT_COMPANY_ID,
          account.branch_id || DEFAULT_BRANCH_ID,
          account.created_at,
          account.updated_at,
          account.deleted_at || null,
          account.created_by,
          account.updated_by
        )
      }
    }
    
    // Yedek tabloyu sil
    db.exec('DROP TABLE IF EXISTS accounts_backup')
  } catch (e: any) {
    // Migration hatası - mevcut tablo zaten doğru yapıda olabilir
    console.warn('Accounts tablosu migration hatası (normal olabilir):', e.message)
  }

  // Chart of Accounts (Hesap Planı)
  db.exec(`
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      account_type TEXT,
      type TEXT,
      balance REAL DEFAULT 0,
      parent_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id)
    )
  `)
  try { db.exec('ALTER TABLE chart_of_accounts ADD COLUMN account_type TEXT') } catch {}
  try { db.exec('ALTER TABLE chart_of_accounts ADD COLUMN type TEXT') } catch {}
  try { db.exec('ALTER TABLE chart_of_accounts ADD COLUMN balance REAL DEFAULT 0') } catch {}
  try { db.exec('ALTER TABLE chart_of_accounts ADD COLUMN updated_at TEXT') } catch {}
  try { db.exec('ALTER TABLE chart_of_accounts ADD COLUMN deleted_at TEXT') } catch {}
  try {
    db.exec(`
      UPDATE chart_of_accounts
      SET account_type = type
      WHERE (account_type IS NULL OR TRIM(account_type) = '')
        AND type IS NOT NULL AND TRIM(type) != ''
    `)
  } catch {}
  try {
    db.exec(`
      UPDATE chart_of_accounts
      SET type = account_type
      WHERE (type IS NULL OR TRIM(type) = '')
        AND account_type IS NOT NULL AND TRIM(account_type) != ''
    `)
  } catch {}
  try {
    db.exec(`
      UPDATE chart_of_accounts
      SET balance = 0
      WHERE balance IS NULL
    `)
  } catch {}

  // Temel hesap planını seed et
  try {
    const seedAccounts = [
      { code: '100', name: 'Dönen Varlıklar', account_type: 'asset', parent_code: null },
      { code: '150', name: 'Stoklar', account_type: 'asset', parent_code: '100' },
      { code: '120', name: 'Alacaklar', account_type: 'asset', parent_code: '100' },
      { code: '191', name: 'KDV', account_type: 'asset', parent_code: '100' },
      { code: '200', name: 'Kısa Vadeli Yükümlülükler', account_type: 'liability', parent_code: null },
      { code: '320', name: 'Satıcılar', account_type: 'liability', parent_code: '200' },
      { code: '500', name: 'Özkaynaklar', account_type: 'equity', parent_code: null },
      { code: '590', name: 'Dönem Net Karı', account_type: 'equity', parent_code: '500' },
      { code: '600', name: 'Satış Gelirleri', account_type: 'revenue', parent_code: null },
      { code: '620', name: 'Satılan Malın Maliyeti', account_type: 'expense', parent_code: null },
      { code: '720', name: 'Üretim Giderleri', account_type: 'expense', parent_code: null },
      { code: '730', name: 'Genel Yönetim Giderleri', account_type: 'expense', parent_code: null },
    ]
    const insertSeed = db.prepare(`
      INSERT OR IGNORE INTO chart_of_accounts
      (id, code, name, account_type, type, balance, parent_id)
      VALUES (?, ?, ?, ?, ?, ?, (SELECT id FROM chart_of_accounts WHERE code = ?))
    `)
    for (const account of seedAccounts) {
      insertSeed.run(
        `coa_${account.code}`,
        account.code,
        account.name,
        account.account_type,
        account.account_type,
        0,
        account.parent_code
      )
    }
    const updateParent = db.prepare(`
      UPDATE chart_of_accounts
      SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = ?)
      WHERE code = ? AND (parent_id IS NULL OR TRIM(parent_id) = '')
    `)
    for (const account of seedAccounts) {
      if (account.parent_code) {
        updateParent.run(account.parent_code, account.code)
      }
    }
  } catch {}

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
      journal_entry_line_id TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      description TEXT,
      reference_type TEXT,
      reference_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id),
      FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id)
    )
  `)
  try { db.exec('ALTER TABLE general_ledger ADD COLUMN journal_entry_line_id TEXT') } catch {}
  try { db.exec('ALTER TABLE general_ledger ADD COLUMN reference_type TEXT') } catch {}
  try { db.exec('ALTER TABLE general_ledger ADD COLUMN reference_id TEXT') } catch {}
  try { db.exec('ALTER TABLE general_ledger ADD COLUMN updated_at TEXT') } catch {}
  try { db.exec('ALTER TABLE general_ledger ADD COLUMN deleted_at TEXT') } catch {}

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
      deleted_at TEXT,
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
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN cancel_reason TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN deleted_at TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN invoice_id TEXT')
  } catch {}
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN invoice_number TEXT')
  } catch {}
  
  // İskonto kolonları ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN discount_rate REAL DEFAULT 0')
  } catch {}
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN discount_amount REAL DEFAULT 0')
  } catch {}
  
  // Onay alanları ekle (risk limiti aşan sevkiyatlar için)
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN approval_status TEXT DEFAULT NULL')
  } catch {}
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN approved_by TEXT DEFAULT NULL')
  } catch {}
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN approved_at TEXT DEFAULT NULL')
  } catch {}
  try {
    db.exec('ALTER TABLE shipments ADD COLUMN approval_requested_at TEXT DEFAULT NULL')
  } catch {}

  // Bildirimler tablosu (local DB için)
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      reference_type TEXT,
      reference_id TEXT,
      read INTEGER DEFAULT 0,
      read_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)
  
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)')
  } catch {}
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)')
  } catch {}
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)')
  } catch {}

  // Direkt mesajlaşma (kullanıcılar arası anlık mesaj)
  db.exec(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      body TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id)
    )
  `)
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_direct_messages_from_to ON direct_messages(from_user_id, to_user_id)')
  } catch {}
  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages(created_at)')
  } catch {}

  // Shipment Items (Sevkiyat Kalemleri)
  db.exec(`
    CREATE TABLE IF NOT EXISTS shipment_items (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      serial_numbers TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)

  // shipment_items tablosuna unit_price ve total_price kolonları ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE shipment_items ADD COLUMN unit_price REAL DEFAULT 0')
  } catch {}
  try {
    db.exec('ALTER TABLE shipment_items ADD COLUMN total_price REAL DEFAULT 0')
  } catch {}
  try {
    db.exec('ALTER TABLE shipment_items ADD COLUMN deleted_at TEXT')
  } catch {}

  // Invoices (Faturalar)
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      shipment_id TEXT,
      customer_id TEXT NOT NULL,
      invoice_date TEXT NOT NULL,
      type TEXT DEFAULT 'sale',
      status TEXT DEFAULT 'issued',
      total_amount REAL DEFAULT 0,
      discount_rate REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      final_amount REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (shipment_id) REFERENCES shipments(id),
      FOREIGN KEY (customer_id) REFERENCES accounts(id)
    )
  `)
  
  // İskonto kolonlarını ekle (eğer yoksa)
  try {
    db.exec('ALTER TABLE invoices ADD COLUMN discount_rate REAL DEFAULT 0')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('discount_rate kolonu eklenirken hata:', e.message)
    }
  }
  try {
    db.exec('ALTER TABLE invoices ADD COLUMN discount_amount REAL DEFAULT 0')
  } catch (e: any) {
    if (!e.message?.includes('duplicate column')) {
      console.warn('discount_amount kolonu eklenirken hata:', e.message)
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `)

  // Sales Orders (Satış Siparişleri)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales_orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      order_number TEXT UNIQUE NOT NULL,
      order_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      total_amount REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      final_amount REAL DEFAULT 0,
      payment_terms_days INTEGER DEFAULT 0,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (customer_id) REFERENCES accounts(id)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS sales_order_items (
      id TEXT PRIMARY KEY,
      sales_order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      production_order_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id)
    )
  `)

  // Purchase Orders (Satın Alma Siparişleri)
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL,
      order_number TEXT UNIQUE NOT NULL,
      order_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      total_amount REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      final_amount REAL DEFAULT 0,
      payment_terms_days INTEGER DEFAULT 0,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (supplier_id) REFERENCES accounts(id)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      purchase_order_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `)

  // Cash Boxes (Kasa)
  db.exec(`
    CREATE TABLE IF NOT EXISTS cash_boxes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currency TEXT DEFAULT 'TRY',
      balance REAL DEFAULT 0,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    )
  `)

  // Banks (Banka)
  db.exec(`
    CREATE TABLE IF NOT EXISTS banks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      iban TEXT,
      account_no TEXT,
      currency TEXT DEFAULT 'TRY',
      balance REAL DEFAULT 0,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    )
  `)

  // Payments (Tahsilat / Ödeme)
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      invoice_id TEXT,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      method TEXT,
      type TEXT NOT NULL, -- 'receipt' or 'payment'
      cash_box_id TEXT,
      bank_id TEXT,
      reference_type TEXT,
      reference_id TEXT,
      notes TEXT,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (cash_box_id) REFERENCES cash_boxes(id),
      FOREIGN KEY (bank_id) REFERENCES banks(id)
    )
  `)

  // E-Invoice Integrations (Entegratör ayarları ve log)
  db.exec(`
    CREATE TABLE IF NOT EXISTS e_invoice_integrations (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      config_json TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS e_invoice_logs (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      request_payload TEXT,
      response_payload TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    )
  `)

  // Account Transactions (Cari Hesap İşlemleri)
  db.exec(`
    CREATE TABLE IF NOT EXISTS account_transactions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      amount REAL NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    )
  `)

  // Stock Counts (Stok Sayımı)
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_counts (
      id TEXT PRIMARY KEY,
      warehouse_id TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_count_items (
      id TEXT PRIMARY KEY,
      count_id TEXT NOT NULL,
      material_id TEXT NOT NULL,
      expected_qty REAL DEFAULT 0,
      counted_qty REAL DEFAULT 0,
      difference REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (count_id) REFERENCES stock_counts(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    )
  `)

  // Webhook endpoints (entegrasyon: olaylar için dış URL'lere POST)
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_endpoints (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      events TEXT,
      secret TEXT,
      description TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Label Settings (Etiket Ayarları)
  db.exec(`
    CREATE TABLE IF NOT EXISTS label_settings (
      id TEXT PRIMARY KEY,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Varsayılan etiket ayarları
  try {
    const defaultSettings = {
      logo_width: '90',
      logo_height: '15',
      logo_align: 'left',
      product_name_font_size: '15',
      barcode_height: '22',
      qr_code_size: '35',
      detail_font_size: '13',
      label_width: '100',
      label_height: '100',
      label_padding: '3'
    }
    
    for (const [key, value] of Object.entries(defaultSettings)) {
      db.prepare(`
        INSERT OR IGNORE INTO label_settings (id, setting_key, setting_value)
        VALUES (?, ?, ?)
      `).run(`setting-${key}`, key, value)
    }
  } catch (e: any) {
    console.warn('Varsayılan etiket ayarları eklenirken hata:', e.message)
  }

  // Doküman yönetimi (evrak): metadata; dosya diskte uploads/documents altında
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      branch_id TEXT,
      title TEXT NOT NULL,
      category TEXT,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      related_type TEXT,
      related_id TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_documents_related ON documents(related_type, related_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at)`)
  } catch (_) {}

  // Varsayılan admin kullanıcı oluştur (şifre: admin1234)
  const adminPasswordHash = hashPassword('admin1234')
  try {
    db.prepare(`
      INSERT OR IGNORE INTO users (id, username, email, password_hash, full_name, role, is_approved, job_title)
      VALUES ('admin-001', 'admin', 'admin@livasofa.com', ?, 'Sistem Yöneticisi', 'admin', 1, 'Yönetici')
    `).run(adminPasswordHash)

    // Var olan admin şifresini güncelle
    db.prepare(`
      UPDATE users
      SET password_hash = ?
      WHERE username = 'admin'
    `).run(adminPasswordHash)
  } catch (e) {
    // Admin zaten varsa hata verme
  }

  // Performans için temel indeksler
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
      CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_production_order_id ON orders(production_order_id);
      CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON sales_orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_sales_orders_order_date ON sales_orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
      CREATE INDEX IF NOT EXISTS idx_sales_order_items_sales_order_id ON sales_order_items(sales_order_id);
      CREATE INDEX IF NOT EXISTS idx_sales_order_items_product_id ON sales_order_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_sales_order_items_production_order_id ON sales_order_items(production_order_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
      CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON purchase_order_items(purchase_order_id);
      CREATE INDEX IF NOT EXISTS idx_purchase_order_items_material_id ON purchase_order_items(material_id);
      CREATE INDEX IF NOT EXISTS idx_payments_account_id ON payments(account_id);
      CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
      CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);
      CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
      CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);
      CREATE INDEX IF NOT EXISTS idx_shipments_shipment_date ON shipments(shipment_date);
      CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment_id ON shipment_items(shipment_id);
      CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id ON account_transactions(account_id);
      CREATE INDEX IF NOT EXISTS idx_product_serial_numbers_ready_for_shipment ON product_serial_numbers(ready_for_shipment);
      CREATE INDEX IF NOT EXISTS idx_product_serial_numbers_shipment_id ON product_serial_numbers(shipment_id);
      CREATE INDEX IF NOT EXISTS idx_product_serial_numbers_customer_id ON product_serial_numbers(customer_id);
      CREATE INDEX IF NOT EXISTS idx_product_serial_numbers_product_id ON product_serial_numbers(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_serial_numbers_barcode ON product_serial_numbers(barcode);
      CREATE INDEX IF NOT EXISTS idx_bom_product_id ON bom(product_id);
      CREATE INDEX IF NOT EXISTS idx_bom_material_id ON bom(material_id);
      CREATE INDEX IF NOT EXISTS idx_materials_supplier_id ON materials(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_material_id ON stock_movements(material_id);
    `)
  } catch (e: any) {
    console.warn('Indeksler eklenirken hata:', e.message)
  }

  // Örnek veriler (sadece ilk kurulumda)
  seedInitialData()
}

/**
 * İlk kurulum için örnek veriler
 */
function seedInitialData() {
  if (!db) return

  // Materials (Hammaddeler) - Örnek hammaddeler kaldırıldı
  // Kullanıcılar kendi hammaddelerini ekleyebilir

  // Products (Mamüller) - Örnek ürünler kaldırıldı
  // Kullanıcılar kendi ürünlerini ekleyebilir

  // BOM Reçeteleri - Örnek BOM kayıtları kaldırıldı
  // Kullanıcılar kendi BOM kayıtlarını ekleyebilir

  // Accounts (Cari Hesaplar) - Örnek cari hesaplar kaldırıldı
  // Kullanıcılar kendi cari hesaplarını ekleyebilir
}
