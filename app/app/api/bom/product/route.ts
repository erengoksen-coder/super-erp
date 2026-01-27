import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// DELETE: Bir ürünün tüm BOM kayıtlarını sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    if (!productId) {
      return NextResponse.json({ error: 'product_id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    
    // Ürün kontrolü
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    // Tüm BOM kayıtlarını sil
    const result = db.prepare('DELETE FROM bom WHERE product_id = ?').run(productId)

    return NextResponse.json({
      success: true,
      message: 'Ürünün tüm BOM kayıtları silindi',
      deleted_count: result.changes,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

