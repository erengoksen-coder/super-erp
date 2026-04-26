import { NextResponse } from 'next/server'
import { withAuth as withApiAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { ShipmentService } from '@/lib/production/shipmentService'

/**
 * Üretim emirlerinden toplu sevkiyat ve çeki listesi oluşturma
 */
export const POST = withApiAuth(async (req, user) => {
    try {
        const { order_ids } = await req.json()

        if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
            return fail('Sevkiyat için üretim emri seçilmelidir.', { status: 400 })
        }

        const shipmentService = new ShipmentService()
        const result = await shipmentService.createShipmentFromProduction(order_ids, user.userId)

        if (!result.success) {
            return fail(result.message, { status: 500 })
        }

        return ok(result)
    } catch (error: any) {
        return fail(error.message || 'İşlem sırasında bir hata oluştu', { status: 500 })
    }
})
