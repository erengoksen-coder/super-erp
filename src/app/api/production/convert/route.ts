import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ProductionService } from '@/lib/production/productionService'
import { getAuthUserId } from '@/lib/auth/session'

export const POST = withAuth(async (request: NextRequest) => {
    try {
        const db = getDatabase()
        const payload = await request.json()
        const { order_ids } = payload
        const userId = await getAuthUserId(request)

        if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
            return NextResponse.json({ error: 'Sipariş ID listesi gerekli' }, { status: 400 })
        }

        const productionService = new ProductionService(db)
        const result = await productionService.convertOrdersToProduction({
            order_ids,
            actor_id: userId
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('[Production Convert API] Error:', error)
        return NextResponse.json({ error: error.message || 'Dönüştürme hatası' }, { status: 500 })
    }
})
