/**
 * Database Performance Optimization Migration
 * Eksik index'leri ekler ve sorguları optimize eder
 */

import { getDatabase } from '@/lib/database/db'

export function runPerformanceMigrations() {
  const db = getDatabase()
  
  const indexes = [
    // Orders - En çok kullanılan sorgular için
    { name: 'idx_orders_customer', sql: 'CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)' },
    { name: 'idx_orders_status', sql: 'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)' },
    { name: 'idx_orders_created', sql: 'CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC)' },
    { name: 'idx_orders_company', sql: 'CREATE INDEX IF NOT EXISTS idx_orders_company ON orders(company_id, deleted_at)' },
    
    // Products - Stok sorguları için
    { name: 'idx_products_sku', sql: 'CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)' },
    { name: 'idx_products_barcode', sql: 'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)' },
    { name: 'idx_products_category', sql: 'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)' },
    { name: 'idx_products_active', sql: 'CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)' },
    
    // Materials - Envanter sorguları için
    { name: 'idx_materials_code', sql: 'CREATE INDEX IF NOT EXISTS idx_materials_code ON materials(code)' },
    { name: 'idx_materials_barcode', sql: 'CREATE INDEX IF NOT EXISTS idx_materials_barcode ON materials(barcode)' },
    { name: 'idx_materials_category', sql: 'CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category)' },
    
    // Stock Movements - Raporlama için kritik
    { name: 'idx_stock_material', sql: 'CREATE INDEX IF NOT EXISTS idx_stock_movements_material ON stock_movements(material_id, created_at DESC)' },
    { name: 'idx_stock_product', sql: 'CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, created_at DESC)' },
    { name: 'idx_stock_type', sql: 'CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type, created_at DESC)' },
    { name: 'idx_stock_ref', sql: 'CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON stock_movements(reference_type, reference_id)' },
    
    // Production Orders
    { name: 'idx_prod_order', sql: 'CREATE INDEX IF NOT EXISTS idx_production_orders_number ON production_orders(order_number)' },
    { name: 'idx_prod_status', sql: 'CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status)' },
    { name: 'idx_prod_product', sql: 'CREATE INDEX IF NOT EXISTS idx_production_orders_product ON production_orders(product_id)' },
    { name: 'idx_prod_created', sql: 'CREATE INDEX IF NOT EXISTS idx_production_orders_created ON production_orders(created_at DESC)' },
    
    // Shipments
    { name: 'idx_ship_order', sql: 'CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id)' },
    { name: 'idx_ship_status', sql: 'CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status)' },
    { name: 'idx_ship_created', sql: 'CREATE INDEX IF NOT EXISTS idx_shipments_created ON shipments(created_at DESC)' },
    
    // Accounts (Cari Hesaplar)
    { name: 'idx_accounts_code', sql: 'CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code)' },
    { name: 'idx_accounts_type', sql: 'CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type)' },
    { name: 'idx_accounts_company', sql: 'CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id, deleted_at)' },
    
    // Invoices
    { name: 'idx_invoices_number', sql: 'CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number)' },
    { name: 'idx_invoices_customer', sql: 'CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id)' },
    { name: 'idx_invoices_status', sql: 'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)' },
    { name: 'idx_invoices_date', sql: 'CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC)' },
    
    // Users
    { name: 'idx_users_username', sql: 'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)' },
    { name: 'idx_users_email', sql: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)' },
    { name: 'idx_users_approved', sql: 'CREATE INDEX IF NOT EXISTS idx_users_approved ON users(is_approved)' },
    
    // Audit Logs - Güvenlik için
    { name: 'idx_audit_user', sql: 'CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC)' },
    { name: 'idx_audit_action', sql: 'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type, created_at DESC)' },
    { name: 'idx_audit_entity', sql: 'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_name, entity_id)' },
    
    // Sessions
    { name: 'idx_sessions_user', sql: 'CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, expires_at)' },
    { name: 'idx_sessions_token', sql: 'CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(refresh_token_hash)' },
    
    // Material Stocks (MRP)
    { name: 'idx_mat_stock_warehouse', sql: 'CREATE INDEX IF NOT EXISTS idx_material_stocks_warehouse ON material_stocks(warehouse_id, material_id)' },
    { name: 'idx_mat_stock_critical', sql: 'CREATE INDEX IF NOT EXISTS idx_material_stocks_critical ON material_stocks(threshold, stock_amount)' },
  ]

  let createdCount = 0
  for (const idx of indexes) {
    try {
      db.exec(idx.sql)
      createdCount++
    } catch (e) {
      console.warn(`Index ${idx.name} oluşturulamadı:`, (e as Error).message)
    }
  }

  console.log(`[Performance] ${createdCount}/${indexes.length} index oluşturuldu`)
  
  // ANALYZE komutu ile query planner'ı güncelle
  try {
    db.exec('ANALYZE')
  } catch (e) {
    console.warn('ANALYZE çalıştırılamadı:', (e as Error).message)
  }

  return { createdCount, totalCount: indexes.length }
}

// Prepared statements cache için - sorguları önceden derle
export function prepareCommonStatements(db: ReturnType<typeof getDatabase>) {
  const statements = {
    // Orders
    findOrderById: db.prepare('SELECT * FROM orders WHERE id = ? AND deleted_at IS NULL'),
    findOrdersByCustomer: db.prepare('SELECT * FROM orders WHERE customer_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'),
    findOrdersByStatus: db.prepare('SELECT * FROM orders WHERE status = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ?'),
    
    // Products
    findProductByBarcode: db.prepare('SELECT * FROM products WHERE barcode = ? AND deleted_at IS NULL'),
    findProductBySku: db.prepare('SELECT * FROM products WHERE sku = ? AND deleted_at IS NULL'),
    
    // Materials
    findMaterialByBarcode: db.prepare('SELECT * FROM materials WHERE barcode = ? AND deleted_at IS NULL'),
    findMaterialByCode: db.prepare('SELECT * FROM materials WHERE code = ? AND deleted_at IS NULL'),
    
    // Stock
    findStockByMaterial: db.prepare('SELECT * FROM material_stocks WHERE material_id = ? AND warehouse_id = ?'),
    
    // Production
    findProductionByOrderNumber: db.prepare('SELECT * FROM production_orders WHERE order_number = ? AND deleted_at IS NULL'),
  }

  return statements
}
