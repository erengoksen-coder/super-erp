import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth, withAuthAndPermission, AuthUser } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { logger } from '@/lib/utils/logger'
import { getProductionOrders } from '@/lib/production/getProductionOrders'
import { ProductionService } from '@/lib/production/productionService'

// GET: Tüm üretim emirlerini getir
export const GET = withAuthAndPermission(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url)
    const customerName = searchParams.get('customer_name') // Müşteri ismi arama filtresi
    const search = searchParams.get('search') || searchParams.get('q') // Cari/ürün araması

    // Önce production_orders tablosunun var olup olmadığını kontrol et
    try {
      const db = getDatabase()
      const testQuery = db.prepare('SELECT COUNT(*) as count FROM production_orders').get() as any
      console.log('Production orders count:', testQuery?.count || 0)
    } catch (testError: any) {
      console.error('Production orders table check failed:', testError.message)
      return NextResponse.json({ error: `Veritabanı hatası: ${testError.message}` }, { status: 500 })
    }

    const userId = user.userId
    const orders = await getProductionOrders({ customerName, search, userId })
    return NextResponse.json(orders)
  } catch (error: any) {
    console.error('Error in GET /api/production:', error)
    try {
      await logger.error('[Production API] GET failed', {
        message: error?.message,
        stack: error?.stack,
      })
    } catch { }
    return NextResponse.json({
      error: error.message || 'Üretim emirleri yüklenirken bir hata oluştu',
      details: error.stack
    }, { status: 500 })
  }
}, '/production', 'view')

// POST: Yeni üretim emri oluştur ve stokları düş
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    let body: any
    try {
      body = await parseJsonBody(request)
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Geçersiz istek verisi' },
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Geçersiz istek verisi' },
        { status: 400 }
      )
    }

    const { order_number, product_id, quantity, due_date } = body
    const actorId = user.userId

    const productionService = new ProductionService()
    const result = await productionService.createProductionOrder({
      order_number,
      product_id,
      quantity,
      due_date,
      actor_id: actorId || 'system'
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/production:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
