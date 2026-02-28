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

    // Sevkiyatı kontrol et (iskonto/KDV ile cari hareket yazmak için tüm alanlar)
    const shipment = db.prepare(`
      SELECT id, approval_status, status, customer_id, shipment_number,
             total_amount, discount_rate, discount_amount, tax_rate, tax_amount, final_amount
      FROM shipments
      WHERE id = ? AND deleted_at IS NULL
    `).get(shipmentId) as {
      id: string; approval_status: string | null; status: string; customer_id: string;
      shipment_number?: string; total_amount?: number; discount_rate?: number; discount_amount?: number;
      tax_rate?: number; tax_amount?: number; final_amount?: number;
    } | undefined

    if (!shipment) {
      return fail('Sevkiyat bulunamadı', { status: 404 })
    }

    if (shipment.approval_status !== 'pending') {
      return fail('Bu sevkiyat onay beklenmiyor', { status: 400 })
    }

    const now = new Date().toISOString()
    const shipmentNumber = shipment.shipment_number || shipmentId

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
        user.userId,
        now,
        now,
        shipmentId
      )

      // Müşteri cari hesabına toplam borç yaz (onaylandıktan sonra)
      const finalAmount = shipment.final_amount ?? 0
      if (finalAmount > 0) {
        db.prepare(`
          UPDATE accounts
          SET balance = balance + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(finalAmount, shipment.customer_id)
      }

      // Cari hesaba kalem bazında hareket yaz (iskonto + KDV uygulanmış tutar)
      const discountRate = shipment.discount_rate ?? 0
      const discountAmount = shipment.discount_amount ?? 0
      const taxAmount = shipment.tax_amount ?? 0
      const baseTotalAmount = shipment.total_amount ?? 0
      const amountAfterDiscount = baseTotalAmount - discountAmount

      const items = db.prepare(`
        SELECT si.id, si.product_id, si.quantity, si.unit_price, si.total_price,
               p.name as product_name, p.sku as product_sku
        FROM shipment_items si
        LEFT JOIN active_products p ON si.product_id = p.id
        WHERE si.shipment_id = ? AND (si.deleted_at IS NULL OR si.deleted_at = '')
      `).all(shipmentId) as Array<{
        id: string; product_id: string; quantity: number; unit_price: number | null; total_price: number | null;
        product_name?: string | null; product_sku?: string | null;
      }>

      for (const item of items) {
        const unitPrice = item.unit_price ?? 0
        const itemTotal = unitPrice * (item.quantity || 0)
        const itemDiscountAmount = (itemTotal * discountRate) / 100
        const itemAmountAfterDiscount = itemTotal - itemDiscountAmount
        const itemTaxAmount = amountAfterDiscount > 0 ? (itemAmountAfterDiscount / amountAfterDiscount) * taxAmount : 0
        const itemFinalAmount = itemAmountAfterDiscount + itemTaxAmount

        const productName = item.product_name || 'Ürün'
        const productSku = item.product_sku || ''
        let description = `Sevkiyat: ${shipmentNumber} | Ürün: ${productName}${productSku ? ` (${productSku})` : ''} | Adet: ${item.quantity} | Birim Fiyat (BOM): ${unitPrice.toFixed(2)} ₺`
        if (discountRate > 0 && itemDiscountAmount > 0) {
          description += ` | İskonto: %${discountRate.toFixed(2)} (${itemDiscountAmount.toFixed(2)} ₺)`
        }
        if ((shipment.tax_rate ?? 0) > 0 && itemTaxAmount > 0) {
          description += ` | KDV: %${(shipment.tax_rate ?? 0).toFixed(2)} (${itemTaxAmount.toFixed(2)} ₺)`
        }
        description += ` | Toplam: ${itemFinalAmount.toFixed(2)} ₺`

        const transactionId = randomUUID()
        db.prepare(`
            INSERT INTO account_transactions
            (id, account_id, transaction_type, amount, reference_type, reference_id, description, created_at)
            VALUES (?, ?, 'debit', ?, 'shipment_item', ?, ?, CURRENT_TIMESTAMP)
          `).run(transactionId, shipment.customer_id, itemFinalAmount, item.id, description)
      }
    })() // End of transaction

    // Sevkiyat onayı bildirimini tercihi açık olan kullanıcılara gönder
    const { getUserIdsWantingNotification } = await import('@/lib/notifications/preferences')
    const userIds = getUserIdsWantingNotification(db, 'shipment_approved')
    const insertNotification = db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, reference_type, reference_id, created_at)
        VALUES (?, ?, ?, ?, 'success', 'shipment', ?, ?)
      `)
    const notificationTitle = 'Sevkiyat Onaylandı'
    const notificationMessage = `${shipmentId} numaralı sevkiyat ${(user as Record<string, unknown>).full_name || (user as Record<string, unknown>).username || user.userId} tarafından onaylandı.`
    for (const uid of userIds) {
      const notificationId = randomUUID()
      insertNotification.run(notificationId, uid, notificationTitle, notificationMessage, shipmentId, now)
    }

    const { dispatchWebhook } = await import('@/lib/webhooks/dispatch')
    void dispatchWebhook('shipment.approved', {
      shipment_id: shipmentId,
      shipment_number: shipmentNumber,
      approved_by: user.userId,
      approved_at: now,
    })

    // Müşteriye e-posta bildirimi (SMTP yoksa log)
    const customer = db.prepare('SELECT id, name, email FROM accounts WHERE id = ? AND deleted_at IS NULL').get(shipment.customer_id) as { id: string; name: string; email: string | null } | undefined
    if (customer?.email) {
      const { sendEmail } = await import('@/lib/notifications/send')
      const { fillTemplate, emailTemplates } = await import('@/lib/notifications/templates')
      const finalAmount = (shipment.final_amount ?? 0).toFixed(2)
      const subject = fillTemplate(emailTemplates.shipmentApproved.subject, { shipmentNumber })
      const text = fillTemplate(emailTemplates.shipmentApproved.text, { customerName: customer.name, shipmentNumber, finalAmount })
      const html = fillTemplate(emailTemplates.shipmentApproved.html, { customerName: customer.name, shipmentNumber, finalAmount })
      sendEmail({ to: customer.email, subject, text, html }).then((r) => {
        if (!r.ok) {
          import('@/lib/api/logger').then(({ apiLogger }) => apiLogger.warn('Sevkiyat e-posta gönderilemedi', { to: customer.email, error: r.error }))
        }
      }).catch(() => { })
    }

    return ok({ message: 'Sevkiyat başarıyla onaylandı' })
  } catch (error: any) {
    return fail(error.message || 'Onay işlemi başarısız', { status: 500 })
  }
})
