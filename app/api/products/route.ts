import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'

// GET: Tüm ürünleri getir (has_bom=1 ile sadece BOM'u olan ürünler)
export const GET = withAuth(async (request) => {
  return handleApi(async () => {
    const { searchParams } = new URL(request.url)
    const hasBom = searchParams.get('has_bom') === '1' || searchParams.get('has_bom') === 'true'

    const db = getDatabase()
    let products: any[] = []
    try {
      products = db.prepare('SELECT * FROM active_products WHERE deleted_at IS NULL ORDER BY sku').all() as any[]
    } catch {
      try {
        products = db.prepare('SELECT * FROM products WHERE deleted_at IS NULL ORDER BY sku').all() as any[]
      } catch {
        products = db.prepare('SELECT * FROM products ORDER BY sku').all() as any[]
      }
    }

    // MRP: Sadece BOM sayfasında listelenen ürünler (aktif reçetesi olanlar). BOM’da olmayanlar listeden çıkarılır.
    if (hasBom) {
      let productIdsWithBom: Array<{ product_id: string }> = []
      try {
        productIdsWithBom = db.prepare(`
          SELECT DISTINCT b.product_id
          FROM bom b
          JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
          WHERE b.deleted_at IS NULL
        `).all() as Array<{ product_id: string }>
      } catch {
        try {
          productIdsWithBom = db.prepare(`SELECT DISTINCT product_id FROM bom WHERE deleted_at IS NULL`).all() as Array<{ product_id: string }>
        } catch {
          productIdsWithBom = []
        }
      }
      const idSet = new Set(productIdsWithBom.map((r) => r.product_id))
      products = products.filter((p: any) => idSet.has(p.id))
    }

    // Her ürün için gerçek stok miktarını hesapla (sadece tamamlanmış üretim emirlerindeki ürünler)
    const productsWithRealStock = products.map(product => {
      // Sadece production_order tamamlanmış veya production_order_id olmayan barkodları say
      const realStock = db.prepare(`
        SELECT COUNT(*) as count
        FROM product_serial_numbers psn
        LEFT JOIN production_orders po ON psn.production_order_id = po.id
        WHERE psn.product_id = ?
          AND psn.status = 'in_stock'
          AND (psn.production_order_id IS NULL 
               OR po.status = 'completed'
               OR (po.status IS NULL))
      `).get(product.id) as any
      
      return {
        ...product,
        stock_amount: realStock?.count || 0
      }
    })
    
    return ok(productsWithRealStock, { headers: CACHE_HEADERS_SHORT })
  })
})

// POST: Yeni ürün ekle
export const POST = withAuth(async (request: NextRequest) => {
  return handleApi(async () => {
    let body: any
    try {
      body = await parseJsonBody(request)
    } catch {
      const { searchParams } = new URL(request.url)
      const name = searchParams.get('name')?.trim()
      const sku = searchParams.get('sku')?.trim()
      const priceParam = searchParams.get('price')
      const sellingPriceParam = searchParams.get('selling_price')
      if (!name || !sku) {
        return fail('Geçersiz JSON', { status: 400 })
      }
      body = {
        name,
        sku,
        price: priceParam ? Number(priceParam) : 0,
        selling_price: sellingPriceParam ? Number(sellingPriceParam) : undefined,
      }
    }
    const db = getDatabase()
    
    const id = randomUUID()
    const { name, sku, price = 0 } = body

    if (!name || !sku) {
      return fail('name ve sku gerekli', { status: 400 })
    }

    db.prepare(`
      INSERT INTO products (id, name, sku, price)
      VALUES (?, ?, ?, ?)
    `).run(id, name, sku, price)

    return ok({ id, ...body }, { status: 201 })
  })
})



