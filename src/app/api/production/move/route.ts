import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { logAudit } from '@/lib/audit'
import { randomUUID } from 'crypto'

export const POST = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { orderId, toStationId, notes } = await request.json()
    const { companyId, branchId, userId } = authUser
    const db = getDatabase()

    if (!orderId || !toStationId) {
      return fail('orderId ve toStationId gerekli', { status: 400 })
    }

    // Üretim emrini güncelle
    const result = db.prepare(`
      UPDATE production_orders 
      SET current_station = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ? AND branch_id = ?
    `).run(toStationId, orderId, companyId, branchId)

    if (result.changes === 0) {
      return fail('Üretim emri bulunamadı veya yetkiniz yok', { status: 404 })
    }

    // İstasyon geçmişine kaydet
    const historyId = randomUUID()
    db.prepare(`
      INSERT INTO production_order_operations (id, production_order_id, operation_id, status, notes, company_id, branch_id)
      VALUES (?, ?, ?, 'completed', ?, ?, ?)
    `).run(historyId, orderId, toStationId, notes || `İstasyona geçiş: ${toStationId}`, companyId, branchId)

    logAudit(db, {
      tableName: 'production_orders',
      action: 'update',
      recordId: orderId,
      userId,
      companyId,
      branchId,
      after: { current_station: toStationId, notes }
    })

    return ok({ message: 'İstasyon başarıyla güncellendi', orderId, toStationId })
  })
})
