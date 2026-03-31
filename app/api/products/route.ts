import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { logAudit } from '@/lib/audit'

// GET: Tüm ürünleri getir
export const GET = withAuth(async (request, authUser) => {
  return handleApi(async () => {
    const { searchParams } = new URL(request.url)
    const hasBom = searchParams.get('has_bom') === '1' || searchParams.get('has_bom') === 'true'
    const { companyId, branchId } = authUser

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
    const productsWithRealStock = products.map(product => {
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
    
    return ok(productsWithRealStock, { headers: CACHE_HEADERS_SHORT })
  })
})

// POST: Yeni ürün ekle
export const POST = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const body = await parseJsonBody(request)
    const { companyId, branchId } = authUser
    const db = getDatabase()
    
    const id = randomUUID()
    const { name, sku, price = 0, selling_price = 0 } = body

    if (!name || !sku) {
      return fail('name ve sku gerekli', { status: 400 })
    }

    db.prepare(`
      INSERT INTO products (id, name, sku, price, selling_price, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, sku, price, selling_price, companyId, branchId)

    logAudit(db, {
      tableName: 'products',
      action: 'create',
      recordId: id,
      userId: authUser.userId,
      companyId,
      branchId,
      after: { name, sku, price, selling_price }
    })

    return ok({ id, name, sku, price, selling_price }, { status: 201 })
  })
})
