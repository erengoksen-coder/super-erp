import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { randomUUID } from 'crypto'

// POST: Sevkiyat onayı
export const POST = withAuth(async (
  request: NextRequest,
  user,
  context?: unknown
) => {
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id?: string } | Promise<{ id?: string }> } | undefined)?.params
    )
    const shipmentId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).pop()
    
    if (!shipmentId) {
      return fail('Sevkiyat ID gerekli', { status: 400 })
    }
    
    // Kullanıcının onay yetkisi var mı kontrol et
    const userRole = (user.role || '').toString().toLowerCase()
    const hasApprovalPermission = 
      userRole === 'admin' || 
      userRole === 'manager' || 
      userRole === 'muhasebe' ||
      userRole.includes('muhasebe') ||
      userRole.includes('yönetici') ||
      userRole.includes('yonetici')
    
    if (!hasApprovalPermission) {
      return fail('Bu işlem için yetkiniz yok. Sadece admin, yönetici veya muhasebe onay verebilir.', { status: 403 })
    }
    
    const db = getDatabase()
    
    // Sevkiyatı kontrol et
    const shipment = db.prepare(`
      SELECT id, approval_status, status, customer_id
      FROM shipments
      WHERE id = ? AND deleted_at IS NULL
    `).get(shipmentId) as { id: string; approval_status: string | null; status: string; customer_id: string } | undefined
    
    if (!shipment) {
      return fail('Sevkiyat bulunamadı', { status: 404 })
    }
    
    if (shipment.approval_status !== 'pending') {
      return fail('Bu sevkiyat onay beklenmiyor', { status: 400 })
    }
    
    const now = new Date().toISOString()
    
    db.transaction(() => {
      // Sevkiyatı onayla
      db.prepare(`
        UPDATE shipments
        SET approval_status = 'approved',
            approved_by = ?,
            approved_at = ?,
            status = 'delivered',
            updated_at = ?
        WHERE id = ?
      `).run(
        user.id,
        now,
        now,
        shipmentId
      )
      
      // Müşteri cari hesabına toplam borç yaz (onaylandıktan sonra)
      const shipmentDetails = db.prepare(`
        SELECT final_amount
        FROM shipments
        WHERE id = ?
      `).get(shipmentId) as { final_amount: number } | undefined
      
      if (shipmentDetails) {
        db.prepare(`
          UPDATE accounts
          SET balance = balance + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(shipmentDetails.final_amount, shipment.customer_id)
      }
      
      // Tüm kullanıcılara onay bildirimi gönder
      const allUsers = db.prepare(`
        SELECT id
        FROM users
        WHERE deleted_at IS NULL
      `).all() as Array<{ id: string }>
      
      const insertNotification = db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, reference_type, reference_id, created_at)
        VALUES (?, ?, ?, ?, 'success', 'shipment', ?, ?)
      `)
      
      const notificationTitle = 'Sevkiyat Onaylandı'
      const notificationMessage = `${shipmentId} numaralı sevkiyat ${user.full_name || user.username} tarafından onaylandı.`
      
      for (const u of allUsers) {
        const notificationId = randomUUID()
        insertNotification.run(
          notificationId,
          u.id,
          notificationTitle,
          notificationMessage,
          shipmentId,
          now
        )
      }
    })()
    
    return ok({ message: 'Sevkiyat başarıyla onaylandı' })
  } catch (error: any) {
    return fail(error.message || 'Onay işlemi başarısız', { status: 500 })
  }
})
