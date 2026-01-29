import { NextRequest } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'

// GET: Tüm ürünleri getir
export async function GET() {
  return handleApi(async () => {
    const db = getDatabase()
    const products = db.prepare('SELECT * FROM products WHERE deleted_at IS NULL ORDER BY sku').all() as any[]
    
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
}

// POST: Yeni ürün ekle
export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const body = await request.json()
    const db = getDatabase()
    
    const id = randomUUID()
    const { name, sku, price = 0 } = body

    db.prepare(`
      INSERT INTO products (id, name, sku, price)
      VALUES (?, ?, ?, ?)
    `).run(id, name, sku, price)

    return ok({ id, ...body }, { status: 201 })
  })
}


