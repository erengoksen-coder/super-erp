import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getProductionOrders } from '@/lib/production/getProductionOrders'
import { getAuthUserId } from '@/lib/auth/session'
import { logger } from '@/lib/utils/logger'

async function getActorId(request: NextRequest) {
  return await getAuthUserId(request)
}

// GET: Üretim panosu için veri
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const customerName = searchParams.get('customer_name')
    const search = searchParams.get('search') || searchParams.get('q')

    const userId = await getActorId(request)
    const orders = await getProductionOrders({ customerName, search, userId })
    return NextResponse.json(orders)
  } catch (error: any) {
    try {
      await logger.error('[Production Board API] GET failed', {
        message: error?.message,
        stack: error?.stack,
      })
    } catch {}
    return NextResponse.json(
      {
        error: error?.message || 'Üretim panosu verileri yüklenirken hata oluştu',
      },
      { status: 500 }
    )
  }
})
