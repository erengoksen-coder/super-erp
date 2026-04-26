import { NextRequest } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { apiHandler } from '@/lib/api/handler'
import { logAudit } from '@/lib/audit'

// GET: Tüm ürünleri getir
export const GET = apiHandler(async (req, { user }) => {
  const { searchParams } = new URL(req.url)
  const hasBom = searchParams.get('has_bom') === '1' || searchParams.get('has_bom') === 'true'
  const { companyId, branchId } = user!

  const db = getDatabase()
  
  // Multi-tenant filtreleme
  let products = db.prepare(`
    SELECT * FROM products 
    WHERE deleted_at IS NULL AND company_id = ? AND branch_id = ?
    ORDER BY sku
  `).all(companyId, branchId) as any[]

  if (hasBom) {
    const productIdsWithBom = db.prepare(`
      SELECT DISTINCT b.product_id
      FROM bom b
      JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
      WHERE b.deleted_at IS NULL AND b.company_id = ? AND b.branch_id = ?
    `).all(companyId, branchId) as Array<{ product_id: string }>
    
    const idSet = new Set(productIdsWithBom.map((r) => r.product_id))
    products = products.filter((p: any) => idSet.has(p.id))
  }

  // Her ürün için gerçek stok miktarını hesapla
  return products.map(product => {
    const realStock = db.prepare(`
      SELECT COUNT(*) as count
      FROM product_serial_numbers psn
      LEFT JOIN production_orders po ON psn.production_order_id = po.id
      WHERE psn.product_id = ?
        AND psn.status = 'in_stock'
        AND po.company_id = ? AND po.branch_id = ?
        AND (psn.production_order_id IS NULL OR po.status = 'completed')
    `).get(product.id, companyId, branchId) as any
    
    return {
      ...product,
      stock_amount: realStock?.count || 0
    }
  })
})

// POST: Yeni ürün ekle
export const POST = apiHandler(async (req, { user }) => {
  const body = await req.json()
  const { companyId, branchId, userId } = user!
  const db = getDatabase()
  
  const id = randomUUID()
  const { name, sku, price = 0, selling_price = 0 } = body

  if (!name || !sku) {
    throw new Error('name ve sku gerekli') // apiHandler bunu yakalayacak
  }

  db.prepare(`
    INSERT INTO products (id, name, sku, price, selling_price, company_id, branch_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, sku, price, selling_price, companyId, branchId)

  logAudit(db, {
    tableName: 'products',
    action: 'create',
    recordId: id,
    userId: userId,
    companyId,
    branchId,
    after: { name, sku, price, selling_price }
  })

  return { id, name, sku, price, selling_price }
})
