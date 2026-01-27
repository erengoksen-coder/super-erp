import { NextRequest, NextResponse } from 'next/server'

// GET: Ürün etiket bilgilerini getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id

    if (!productId) {
      return NextResponse.json(
        { error: 'Ürün ID gerekli' },
        { status: 400 }
      )
    }

    // Local database'den ürün bilgilerini al
    const { localDB } = await import('@/lib/database/client')
    const products = await localDB.getProducts()
    const product = products.find((p: any) => p.id === productId)

    if (!product) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: product.id,
      name: product.name,
      sku: product.sku,
      stock_amount: product.stock_amount || 0,
      image_url: product.image_url || null
    })
  } catch (error: any) {
    console.error('Etiket bilgisi yüklenirken hata:', error)
    return NextResponse.json(
      { error: error.message || 'Etiket bilgisi yüklenemedi' },
      { status: 500 }
    )
  }
}


