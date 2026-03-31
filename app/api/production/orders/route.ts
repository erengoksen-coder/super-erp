import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { productionService } from '@/lib/services/production-service'
import { productionOrderSchema } from '@/lib/validation/production-schema'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// GET: Üretim Emirlerini veya Bekleyen Siparişleri listeler
export const GET = withAuth(async (request, _user) => {
  return handleApi(async () => {
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab')
    const db = getDatabase()

    if (tab === 'pending') {
      // Üretim Emri OLMAMIŞ satış siparişlerini getir
      const list = db.prepare(`
        SELECT o.*, p.name as matched_product_name, p.sku as matched_product_sku
        FROM orders o
        LEFT JOIN products p ON o.product_id = p.id
        WHERE o.production_order_id IS NULL 
          AND o.deleted_at IS NULL
          AND o.status IN ('pending', 'approved', 'in_production')
        ORDER BY o.created_at DESC
      `).all()
      return ok(list)
    }

    // Normal Üretim Emirleri
    const list = db.prepare(`
      SELECT po.*, bv.version_no, m.name as product_name, m.code as sku
      FROM production_orders po
      LEFT JOIN bom_versions bv ON po.product_id = bv.id
      LEFT JOIN materials m ON po.product_id = m.id
      WHERE po.deleted_at IS NULL
      ORDER BY po.created_at DESC
    `).all()
    return ok(list)
  })
})

// POST: Yeni Üretim Emri oluşturur ve Hammadde REZERVE eder
export const POST = withAuth(async (request, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId, userId } = authUser
    const body = await parseJsonBody(request)
    
    // Zod Doğrulaması
    const validation = productionOrderSchema.safeParse(body)
    if (!validation.success) {
      return fail(validation.error.errors[0].message, { status: 400 })
    }

    const { orderId, orderNumber } = await productionService.createProductionOrder(validation.data, companyId, branchId, userId)
    
    return ok({ id: orderId, number: orderNumber }, { message: 'Üretim emri açıldı ve malzemeler rezerve edildi' })
  })
})

// PATCH: Üretim Emri Durum Güncelleme (Tamamlama vb.)
export const PATCH = withAuth<{ params: { id: string } }>(async (request, authUser, context) => {
    return handleApi(async () => {
      const { companyId, branchId, userId } = authUser
      const params = await Promise.resolve(context?.params)
      const orderId = params?.id
      
      if (!orderId || typeof orderId !== 'string') {
        return fail('Geçersiz Üretim Emri ID', { status: 400 })
      }
      
      const body = await parseJsonBody(request)
      const { status } = body

      if (status === 'completed') {
        // Üretimi tamamlama ve stok düşme (ProductionService üzerinden)
        await productionService.completeProductionOrder(orderId, companyId, branchId, userId)
        return ok(null, { message: 'Üretim başarıyla tamamlandı. Stoklar güncellendi.' })
      }

      // Diğer durumlar için manuel güncelleme
      const db = getDatabase()
      db.prepare('UPDATE production_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, orderId)
      
      return ok(null, { message: 'Üretim emri durumu güncellendi' })
    })
})
