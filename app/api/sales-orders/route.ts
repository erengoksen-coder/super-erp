import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { scmService } from '@/lib/services/scm-service'
import { orderSchema } from '@/lib/validation/scm-schema'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// GET: Satış siparişlerini listeler
export const GET = withAuth(async (request, _user) => {
  return handleApi(async () => {
    const db = getDatabase()
    const list = db.prepare(`
      SELECT so.*, a.name as customer_name, a.code as customer_code
      FROM sales_orders so
      LEFT JOIN accounts a ON so.customer_id = a.id
      WHERE so.deleted_at IS NULL
      ORDER BY so.created_at DESC
    `).all()
    return ok(list)
  })
})

// POST: Yeni satış siparişi oluşturur ve stok rezerve eder
export const POST = withAuth(async (request, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId, userId } = authUser
    const body = await parseJsonBody(request)
    
    // Zod Doğrulaması
    const validation = orderSchema.safeParse(body)
    if (!validation.success) {
      return fail(validation.error.errors[0].message, { status: 400 })
    }

    const { orderId, orderNumber } = await scmService.createOrder('sale', validation.data, companyId, branchId, userId)
    
    return ok({ id: orderId, number: orderNumber }, { message: 'Satış siparişi başarıyla oluşturuldu ve stok rezerve edildi' })
  })
})

// PATCH: Sipariş sevkiyatı (Otomatik faturalandırma ve bakiye güncelleme)
export const PATCH = withAuth(async (request, authUser, context) => {
    return handleApi(async () => {
      const { companyId, branchId, userId } = authUser
      const params = await Promise.resolve((context as any)?.params)
      const orderId = params?.id
      
      const body = await parseJsonBody(request)
      const { action } = body

      if (action === 'ship') {
        // Sevkiyat, Stok düşümü, Fatura ve Bakiye güncelleme (ScmService üzerinden)
        const { shipmentId, invoiceId } = await scmService.processShipment(orderId, companyId, branchId, userId)
        return ok({ shipmentId, invoiceId }, { message: 'Sipariş başarıyla sevk edildi ve fatura oluşturuldu' })
      }

      return fail('Geçersiz işlem')
    })
})
