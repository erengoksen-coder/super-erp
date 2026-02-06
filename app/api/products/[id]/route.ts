import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

// GET: Tek bir ürün bilgisini getir
export const GET = withAuth(async (
  request: NextRequest,
  _user,
  context?: { params?: { id?: string } | Promise<{ id?: string }> }
) => {
  try {
    const db = getDatabase()
    const resolvedParams = await Promise.resolve(context?.params)
    const productId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).pop()
    if (!productId) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }

    let product: any = null
    try {
      product = db.prepare('SELECT * FROM active_products WHERE id = ? AND deleted_at IS NULL').get(productId)
    } catch {
      product = null
    }

    if (!product) {
      try {
        product = db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(productId)
      } catch {
        product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId)
      }
    }

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
});

// PATCH: Ürün bilgilerini güncelle (stok miktarı dahil)
export const PATCH = withAuth(async (
  request: NextRequest,
  _user,
  context?: { params?: { id?: string } | Promise<{ id?: string }> }
) => {
  try {
    const body = await parseJsonBody(request)
    const { stock_amount, min_stock_level, name, sku, price, selling_price, cost_price } = body

    const db = getDatabase()
    const resolvedParams = await Promise.resolve(context?.params)
    const productId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).pop()
    if (!productId) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }

    // Ürünü bul
    let product: any = null
    try {
      product = db.prepare('SELECT * FROM active_products WHERE id = ? AND deleted_at IS NULL').get(productId)
    } catch {
      product = null
    }
    if (!product) {
      try {
        product = db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(productId)
      } catch {
        product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId)
      }
    }
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
    updateParams.push(productId)

    db.prepare(updateQuery).run(...updateParams)

    return NextResponse.json({
      success: true,
      message: 'Ürün başarıyla güncellendi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
});

// DELETE: Ürünü sil
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params?: { id?: string } | Promise<{ id?: string }> }
) => {
  try {
    const db = getDatabase()
    const resolvedParams = await Promise.resolve(context?.params)
    const productId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).pop()
    if (!productId) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }

    // Ürünü bul
    let product: any = null
    try {
      product = db.prepare('SELECT * FROM active_products WHERE id = ? AND deleted_at IS NULL').get(productId)
    } catch {
      product = null
    }
    if (!product) {
      try {
        product = db.prepare('SELECT * FROM products WHERE id = ? AND deleted_at IS NULL').get(productId)
      } catch {
        product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId)
      }
    }
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    const isAdmin = ['admin', 'yönetici', 'yonetici'].includes((user.role || '').toString().trim().toLowerCase())
    if (!isAdmin) {
      // Admin değilse: BOM, üretim emri veya barkodda kullanılıyorsa silmeyi engelle
      const bomCount = db.prepare('SELECT COUNT(*) as count FROM bom WHERE product_id = ?').get(productId) as any
      const orderCount = db.prepare('SELECT COUNT(*) as count FROM production_orders WHERE product_id = ?').get(productId) as any
      const serialCount = db.prepare('SELECT COUNT(*) as count FROM product_serial_numbers WHERE product_id = ?').get(productId) as any
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
    }

    // Ürünü sil
    db.prepare('UPDATE products SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL')
      .run(productId)

    return NextResponse.json({
      success: true,
      message: 'Ürün başarıyla silindi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
});

