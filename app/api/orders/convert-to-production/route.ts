import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { logger } from '@/lib/utils/logger'
import { ProductionService } from '@/lib/production/productionService'

// POST: Siparişleri üretim emrine dönüştür
export const POST = withAuth(async (request: NextRequest, user) => {
  logger.info('[BAŞLANGIÇ] Sipariş dönüştürme API çağrıldı')
  try {
    const body = await parseJsonBody(request)
    const { order_ids, due_date } = body

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json({ error: 'Sipariş ID\'leri gerekli' }, { status: 400 })
    }

    const actorId = user.userId
    const productionService = new ProductionService()

    const result = await productionService.convertOrdersToProduction({
      order_ids,
      due_date,
      actor_id: actorId || 'system'
    })

    if (!result.success && result.errors.length > 0) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    logger.error('[HATA] Sipariş dönüştürme başarısız', { error: error.message })
    return NextResponse.json({
      success: false,
      error: error.message || 'Dönüştürme işlemi sırasında bir hata oluştu'
    }, { status: 500 })
  }
})
