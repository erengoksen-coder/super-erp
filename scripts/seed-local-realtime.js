const Database = require('better-sqlite3')
const { join } = require('path')
const { existsSync, writeFileSync, readFileSync, unlinkSync } = require('fs')
const { randomUUID } = require('crypto')

const dbPath = join(process.cwd(), 'data', 'erp.db')
if (!existsSync(dbPath)) {
  console.error('Veritabanı dosyası bulunamadı:', dbPath)
  process.exit(1)
}

const DEFAULT_COMPANY_ID = 'company_default'
const DEFAULT_BRANCH_ID = 'branch_default'

const db = new Database(dbPath)
db.pragma('foreign_keys = OFF')

const seedInfoPath = join(process.cwd(), 'data', 'seed-local-realtime.json')
const shouldRollback = process.argv.includes('--rollback')

if (shouldRollback) {
  if (!existsSync(seedInfoPath)) {
    console.error('Rollback dosyasi bulunamadi:', seedInfoPath)
    process.exit(1)
  }
  const seedInfo = JSON.parse(readFileSync(seedInfoPath, 'utf8'))

  db.prepare('DELETE FROM production_orders WHERE id = ?').run(seedInfo.productionId)
  db.prepare('DELETE FROM orders WHERE id = ?').run(seedInfo.orderId)
  db.prepare('DELETE FROM products WHERE id = ?').run(seedInfo.productId)
  db.prepare('DELETE FROM materials WHERE id = ?').run(seedInfo.materialId)

  unlinkSync(seedInfoPath)
  console.log('Rollback tamamlandi.')
  process.exit(0)
}

const now = new Date().toISOString()
const suffix = Date.now()

const materialId = `mat_${randomUUID()}`
const productId = `prd_${randomUUID()}`
const orderId = `ord_${randomUUID()}`
const productionId = `prdord_${randomUUID()}`

const materialCode = `TEST-MAT-${suffix}`
const productSku = `TEST-SKU-${suffix}`
const orderNumber = `SIP-TEST-${suffix}`
const productionNumber = `URE-TEST-${suffix}`

db.prepare(`
  INSERT INTO materials (
    id, code, name, category, unit, stock_amount, min_stock_level, purchase_price,
    company_id, branch_id, created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  materialId,
  materialCode,
  `Test Malzeme ${suffix}`,
  'Test',
  'adet',
  5,
  10,
  12.5,
  DEFAULT_COMPANY_ID,
  DEFAULT_BRANCH_ID,
  now,
  now
)

db.prepare(`
  INSERT INTO products (
    id, name, sku, price, selling_price, stock_amount, min_stock_level,
    company_id, branch_id, created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  productId,
  `Test Ürün ${suffix}`,
  productSku,
  100,
  125,
  3,
  8,
  DEFAULT_COMPANY_ID,
  DEFAULT_BRANCH_ID,
  now,
  now
)

db.prepare(`
  INSERT INTO orders (
    id, order_number, dealer_name, customer_name, product_name, product_sku, product_id,
    quantity, unit_price, total_amount, status, order_date, company_id, branch_id,
    created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  orderId,
  orderNumber,
  'Test Bayi',
  'Test Müşteri',
  `Test Ürün ${suffix}`,
  productSku,
  productId,
  2,
  100,
  200,
  'pending',
  now,
  DEFAULT_COMPANY_ID,
  DEFAULT_BRANCH_ID,
  now,
  now
)

db.prepare(`
  INSERT INTO production_orders (
    id, order_number, product_id, quantity, status, current_station,
    company_id, branch_id, created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  productionId,
  productionNumber,
  productId,
  1,
  'in_progress',
  'döseme',
  DEFAULT_COMPANY_ID,
  DEFAULT_BRANCH_ID,
  now,
  now
)

const counts = {
  materials: db.prepare('SELECT COUNT(*) as count FROM materials').get().count,
  products: db.prepare('SELECT COUNT(*) as count FROM products').get().count,
  orders: db.prepare('SELECT COUNT(*) as count FROM orders').get().count,
  production_orders: db.prepare('SELECT COUNT(*) as count FROM production_orders').get().count,
}

console.log('Seed tamamlandı.')
console.log('Yeni kayıtlar:', {
  materialId,
  productId,
  orderId,
  productionId,
})
console.log('Toplam sayılar:', counts)

writeFileSync(
  seedInfoPath,
  JSON.stringify({ materialId, productId, orderId, productionId }, null, 2)
)
console.log('Rollback için dosya yazildi:', seedInfoPath)
