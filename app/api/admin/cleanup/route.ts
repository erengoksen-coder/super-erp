import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { getDatabase } from '@/lib/database/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Auth kontrolü
    const authHeader = request.headers.get('authorization')
    const headerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : authHeader?.trim()
    const cookieToken = request.cookies.get('auth-token')?.value || request.cookies.get('access_token')?.value
    const token = headerToken || cookieToken

    if (!token) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
    }

    const db = getDatabase()
    const results: Record<string, number> = {}

    // Siparişleri sil (önce ilişkili tabloları temizle)
    try {
      // Product serial numbers (kartlar) - siparişlere bağlı
      const deletedCards = db.prepare('DELETE FROM product_serial_numbers WHERE order_id IS NOT NULL').run()
      results.product_serial_numbers = deletedCards.changes || 0

      // Orders (Siparişler)
      const deletedOrders = db.prepare('DELETE FROM orders').run()
      results.orders = deletedOrders.changes || 0
    } catch (error: any) {
      console.error('Sipariş silme hatası:', error)
      return NextResponse.json({ 
        error: 'Siparişler silinirken hata oluştu',
        details: error.message 
      }, { status: 500 })
    }

    // Cari hesapları sil
    try {
      const deletedAccounts = db.prepare('DELETE FROM accounts').run()
      results.accounts = deletedAccounts.changes || 0
    } catch (error: any) {
      console.error('Cari hesap silme hatası:', error)
      return NextResponse.json({ 
        error: 'Cari hesaplar silinirken hata oluştu',
        details: error.message 
      }, { status: 500 })
    }

    // Hammadde verilerini sil
    try {
      // Material stocks (hammadde stokları)
      const deletedMaterialStocks = db.prepare('DELETE FROM material_stocks').run()
      results.material_stocks = deletedMaterialStocks.changes || 0

      // Materials (hammaddeler)
      const deletedMaterials = db.prepare('DELETE FROM materials').run()
      results.materials = deletedMaterials.changes || 0
    } catch (error: any) {
      console.error('Hammadde silme hatası:', error)
      return NextResponse.json({ 
        error: 'Hammadde verileri silinirken hata oluştu',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Veriler başarıyla silindi',
      deleted: results
    })
  } catch (error: any) {
    console.error('Temizleme hatası:', error)
    return NextResponse.json({
      error: 'Temizleme işlemi başarısız',
      details: error?.message || 'Bilinmeyen hata'
    }, { status: 500 })
  }
}
