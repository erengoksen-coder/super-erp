import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'

// GET: Tüm ürünleri getir
export async function GET() {
  try {
    const db = getDatabase()
    const products = db.prepare('SELECT * FROM products ORDER BY sku').all() as any[]
    
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
    
    return NextResponse.json(productsWithRealStock, {
      headers: CACHE_HEADERS_SHORT,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Yeni ürün ekle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = getDatabase()
    
    const id = randomUUID()
    const { name, sku, price = 0 } = body

    db.prepare(`
      INSERT INTO products (id, name, sku, price)
      VALUES (?, ?, ?, ?)
    `).run(id, name, sku, price)

    return NextResponse.json({ id, ...body }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


