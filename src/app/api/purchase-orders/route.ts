import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { scmService } from '@/lib/services/scm-service'
import { orderSchema } from '@/lib/validation/scm-schema'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// GET: Satınalma siparişlerini listeler
export const GET = withAuth(async (request, _user) => {
  return handleApi(async () => {
    const db = getDatabase()
    const list = db.prepare(`
      SELECT po.*, a.name as supplier_name, a.code as supplier_code
      FROM purchase_orders po
      LEFT JOIN accounts a ON po.supplier_id = a.id
      WHERE po.deleted_at IS NULL
      ORDER BY po.created_at DESC
    `).all()
    return ok(list)
  })
})

// POST: Yeni satınalma siparişi oluşturur
export const POST = withAuth(async (request, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId, userId } = authUser
    const body = await parseJsonBody(request)
    
    // Zod Doğrulaması
    const validation = orderSchema.safeParse(body)
    if (!validation.success) {
      return fail(validation.error.errors[0].message, { status: 400 })
    }

    const { orderId, orderNumber } = await scmService.createOrder('purchase', validation.data, companyId, branchId, userId)
    
    return ok({ id: orderId, number: orderNumber }, { message: 'Satınalma siparişi başarıyla oluşturuldu' })
  })
})

// PATCH: Sipariş durum güncelleme (Kabul vb.)
export const PATCH = withAuth(async (request, authUser, context) => {
    return handleApi(async () => {
      const { companyId, branchId, userId } = authUser
      const params = await Promise.resolve((context as any)?.params)
      const orderId = params?.id
      
      const body = await parseJsonBody(request)
      const { status } = body

      const db = getDatabase()
      db.prepare('UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, orderId)
      
      // Eğer 'completed' yapılıyorsa stok girişi tetiklenebilir (Opsiyonel MRP entegrasyonu)
      
      return ok(null, { message: 'Satınalma siparişi durumu güncellendi' })
    })
})
