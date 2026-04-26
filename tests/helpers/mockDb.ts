/**
 * In-memory SQLite mock for repository layer tests.
 * Provides a real DB instance with minimal schema so we test actual SQL and repository logic.
 */

import Database from 'better-sqlite3'

const DEFAULT_COMPANY_ID = 'company_default'
const DEFAULT_BRANCH_ID = 'branch_default'

/** Minimal orders schema matching lib/database/db.ts for orderRepository tests */
function createOrdersSchema(db: Database.Database): void {
  db.pragma('foreign_keys = OFF')
  db.exec(`CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, name TEXT, deleted_at TEXT)`)
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, name TEXT, sku TEXT, deleted_at TEXT
    )
  `)
  db.exec('CREATE VIEW IF NOT EXISTS active_products AS SELECT * FROM products WHERE deleted_at IS NULL')
  db.exec(`CREATE TABLE IF NOT EXISTS production_orders (id TEXT PRIMARY KEY, order_number TEXT, deleted_at TEXT)`)
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_serial_numbers (
      production_order_id TEXT, product_id TEXT, shipment_id TEXT
    )
  `)
  db.exec(`
    CREATE TABLE orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE,
      dealer_name TEXT,
      customer_name TEXT,
      customer_code TEXT,
      product_name TEXT,
      product_sku TEXT,
      product_id TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL,
      total_amount REAL,
      order_date TEXT,
      delivery_date TEXT,
      status TEXT DEFAULT 'pending',
      production_order_id TEXT,
      configuration TEXT,
      notes TEXT,
      cancel_reason TEXT,
      company_id TEXT DEFAULT '${DEFAULT_COMPANY_ID}',
      branch_id TEXT DEFAULT '${DEFAULT_BRANCH_ID}',
      excel_row_number INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT
    )
  `)
  db.exec('CREATE VIEW active_orders AS SELECT * FROM orders WHERE deleted_at IS NULL')
}

/**
 * Create an in-memory SQLite database with the minimal schema needed for orderRepository.
 * Use in tests with jest.mock('@/lib/database/db', () => ({ getDatabase: () => mockDb, ... }))
 */
export function createInMemoryOrderDb(): Database.Database {
  const db = new Database(':memory:')
  createOrdersSchema(db)
  return db
}

export { DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID }
