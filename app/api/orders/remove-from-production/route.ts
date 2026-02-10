import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { logAudit } from '@/lib/audit'

/**
 * POST: Siparişi üretimden çıkar (yanlışlıkla üretime alınmışsa).
 * orders.status = 'pending', orders.production_order_id = NULL yapılır.
 * Üretim emri (URE-xxx) ve barkodlar silinmez; sadece sipariş-üretim bağı kaldırılır.
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await parseJsonBody<{ orderId: string }>(request)
    const orderId = body?.orderId || (body as any)?.id
    if (!orderId || typeof orderId !== 'string') {
      return fail('Sipariş ID gerekli', { status: 400 })
    }

    const db = getDatabase()
    const row = db.prepare(`
      SELECT id, order_number, status, production_order_id FROM orders WHERE id = ? AND deleted_at IS NULL
    `).get(orderId) as { id: string; order_number: string; status: string; production_order_id: string | null } | undefined

    if (!row) {
      return fail('Sipariş bulunamadı', { status: 404 })
    }

    if (row.status !== 'in_production' && row.status !== 'completed') {
      return fail('Sadece üretimde veya tamamlanmış sipariş üretimden çıkarılabilir', { status: 400 })
    }

    const prevProductionOrderId = row.production_order_id

    db.prepare(`
      UPDATE orders SET status = 'pending', production_order_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(orderId)

    logAudit(db, {
      tableName: 'orders',
      action: 'update',
      recordId: orderId,
      userId: user.userId,
      before: { status: row.status, production_order_id: prevProductionOrderId },
      after: { status: 'pending', production_order_id: null },
    })

    return ok({
      id: orderId,
      order_number: row.order_number,
      message: 'Sipariş üretimden çıkarıldı; tekrar bekleyen siparişlerde görünecek.',
    })
  } catch (error: any) {
    return fail(error?.message || 'İşlem başarısız', { status: 500 })
  }
})
