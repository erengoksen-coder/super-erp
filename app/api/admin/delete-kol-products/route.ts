import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const db = getDatabase()

    // Önce ürünleri bul
    const products = db.prepare(`
      SELECT id, sku, name 
      FROM active_products 
      WHERE sku IN ('KOL-001', 'KOL-002', 'KOL-003')
    `).all() as any[]

    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Silinecek ürün bulunamadı',
        deleted_count: 0
      })
    }

    const productIds = products.map(p => p.id)
    let bomDeleted = 0
    let productsDeleted = 0

    // İlişkili BOM kayıtlarını sil
    for (const productId of productIds) {
      const bomResult = db.prepare('DELETE FROM bom WHERE product_id = ?').run(productId)
      bomDeleted += bomResult.changes
    }

    // Ürünleri sil
    for (const product of products) {
      try {
        const result = db.prepare('DELETE FROM active_products WHERE id = ?').run(product.id)
        if (result.changes > 0) {
          productsDeleted++
        }
      } catch (error: any) {
        console.error(`Ürün silinirken hata (${product.sku}):`, error.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${productsDeleted} ürün ve ${bomDeleted} BOM kaydı silindi`,
      deleted_products: productsDeleted,
      deleted_bom: bomDeleted,
      products: products.map(p => ({ sku: p.sku, name: p.name }))
    })
  } catch (error: any) {
    console.error('KOL ürünleri silinirken hata:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

