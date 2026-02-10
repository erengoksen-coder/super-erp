import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withAuth(async (request: NextRequest, user: { userId: string }) => {
  try {
    const body = await request.json().catch(() => ({})) as { confirm?: boolean }
    if (body?.confirm !== true) {
      return NextResponse.json(
        { error: 'Bu işlem tehlikelidir. Onaylamak için body\'de { "confirm": true } gönderin.' },
        { status: 400 }
      )
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

    logAudit(db, {
      tableName: 'admin_operation',
      action: 'delete',
      recordId: 'cleanup',
      userId: user.userId,
      after: results,
    })

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
}, ['admin'])
