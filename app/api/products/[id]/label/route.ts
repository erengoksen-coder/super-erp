import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

type ProductLabel = {
  id: string
  name: string
  sku: string
  stock_amount?: number | null
  image_url?: string | null
}

// GET: Ürün etiket bilgilerini getir
export const GET = withAuth(async (
  request: NextRequest,
  _user,
  context?: { params?: { id?: string } | Promise<{ id?: string }> }
) => {
  try {
    const resolvedParams = await Promise.resolve(context?.params)
    const productId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).slice(-2)[0]

    if (!productId) {
      return NextResponse.json(
        { error: 'Ürün ID gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    const product = db.prepare(`
      SELECT id, name, sku
      FROM active_products
      WHERE id = ? AND deleted_at IS NULL
    `).get(productId) as ProductLabel | undefined

    if (!product) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { status: 404 }
      )
    }

    const realStock = db.prepare(`
      SELECT COUNT(*) as count
      FROM product_serial_numbers psn
      LEFT JOIN production_orders po ON psn.production_order_id = po.id
      WHERE psn.product_id = ?
        AND psn.status = 'in_stock'
        AND (psn.production_order_id IS NULL
             OR po.status = 'completed'
             OR (po.status IS NULL))
    `).get(productId) as { count?: number } | undefined

    return NextResponse.json({
      id: product.id,
      name: product.name,
      sku: product.sku,
      stock_amount: realStock?.count || 0,
      image_url: null,
    })
  } catch (error: any) {
    console.error('Etiket bilgisi yüklenirken hata:', error)
    return NextResponse.json(
      { error: error.message || 'Etiket bilgisi yüklenemedi' },
      { status: 500 }
    )
  }
});


