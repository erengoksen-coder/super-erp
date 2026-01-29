import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Tek bir ürün bilgisini getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const db = getDatabase()
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(resolvedParams.id) as any

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Ürün bilgilerini güncelle (stok miktarı dahil)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const body = await request.json()
    const { stock_amount, min_stock_level, name, sku, price, selling_price, cost_price } = body

    const db = getDatabase()

    // Ürünü bul
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(resolvedParams.id) as any
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    // Güncelleme sorgusu oluştur
    let updateQuery = 'UPDATE products SET updated_at = CURRENT_TIMESTAMP'
    const updateParams: any[] = []

    if (stock_amount !== undefined) {
      updateQuery += ', stock_amount = ?'
      updateParams.push(stock_amount)
    }

    if (min_stock_level !== undefined) {
      updateQuery += ', min_stock_level = ?'
      updateParams.push(min_stock_level)
    }

    if (name !== undefined) {
      updateQuery += ', name = ?'
      updateParams.push(name)
    }

    if (sku !== undefined) {
      updateQuery += ', sku = ?'
      updateParams.push(sku)
    }

    if (price !== undefined) {
      updateQuery += ', price = ?'
      updateParams.push(price)
    }

    if (selling_price !== undefined) {
      updateQuery += ', selling_price = ?'
      updateParams.push(selling_price)
    }

    if (cost_price !== undefined) {
      updateQuery += ', cost_price = ?'
      updateParams.push(cost_price)
    }

    updateQuery += ' WHERE id = ? AND deleted_at IS NULL'
    updateParams.push(resolvedParams.id)

    db.prepare(updateQuery).run(...updateParams)

    return NextResponse.json({
      success: true,
      message: 'Ürün başarıyla güncellendi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Ürünü sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const db = getDatabase()

    // Ürünü bul
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(resolvedParams.id) as any
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    // İlişkili kayıtları kontrol et
    const bomCount = db.prepare('SELECT COUNT(*) as count FROM bom WHERE product_id = ?').get(resolvedParams.id) as any
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM production_orders WHERE product_id = ?').get(resolvedParams.id) as any
    const serialCount = db.prepare('SELECT COUNT(*) as count FROM product_serial_numbers WHERE product_id = ?').get(resolvedParams.id) as any

    if (bomCount.count > 0 || orderCount.count > 0 || serialCount.count > 0) {
      return NextResponse.json(
        { 
          error: 'Bu ürün BOM, üretim emri veya barkod kayıtlarında kullanılıyor. Silinemez.',
          details: {
            bom_count: bomCount.count,
            order_count: orderCount.count,
            serial_count: serialCount.count,
          }
        },
        { status: 400 }
      )
    }

    // Ürünü sil
    db.prepare('UPDATE products SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL')
      .run(resolvedParams.id)

    return NextResponse.json({
      success: true,
      message: 'Ürün başarıyla silindi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

