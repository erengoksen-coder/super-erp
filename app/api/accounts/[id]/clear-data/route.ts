import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

type ShipmentRow = {
  id: string
  customer_id: string
  status: string
  final_amount?: number | null
  total_amount?: number | null
  invoice_id?: string | null
}

type ShipmentItemRow = {
  id: string
  product_id: string
  quantity: number
  serial_numbers: string | null
}

/**
 * POST: Bu carinin girdi verilerini siler (cari hareketler + sevkiyatlar).
 * Cari ayarları (ad, kod, iskonto, risk limiti vb.) değişmez.
 */
export const POST = withAuth(async (
  _request: NextRequest,
  _user,
  context?: unknown
) => {
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id?: string } | Promise<{ id?: string }> } | undefined)?.params
    )
    const accountId = resolvedParams?.id ?? new URL(_request.url).pathname.split('/').filter(Boolean).slice(-2)[0]
    if (!accountId) {
      return fail('Cari ID gerekli', { status: 400 })
    }

    const db = getDatabase()

    const account = db.prepare('SELECT id, type FROM accounts WHERE id = ? AND deleted_at IS NULL').get(accountId) as { id: string; type?: string } | undefined
    if (!account) {
      return fail('Cari hesap bulunamadı', { status: 404 })
    }
    if (account.type !== 'customer') {
      return fail('Sadece müşteri (cari) hesapları için kullanılabilir', { status: 400 })
    }

    const shipments = db.prepare(`
      SELECT id, customer_id, status, final_amount, total_amount, invoice_id
      FROM shipments
      WHERE customer_id = ? AND deleted_at IS NULL
    `).all(accountId) as ShipmentRow[]

    db.transaction(() => {
      for (const shipment of shipments) {
        const shipmentId = shipment.id
        const isCancelled = shipment.status === 'cancelled'

        if (!isCancelled) {
          const items = db.prepare(`
            SELECT id, product_id, quantity, serial_numbers
            FROM shipment_items
            WHERE shipment_id = ? AND (deleted_at IS NULL OR deleted_at = '')
          `).all(shipmentId) as ShipmentItemRow[]

          const linkedInvoiceId = shipment.invoice_id
            || (db.prepare('SELECT id FROM invoices WHERE shipment_id = ? AND deleted_at IS NULL').get(shipmentId) as { id?: string } | undefined)?.id
          if (linkedInvoiceId) {
            db.prepare(`
              UPDATE invoices SET status = 'cancelled', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(linkedInvoiceId)
            db.prepare(`UPDATE invoice_items SET deleted_at = CURRENT_TIMESTAMP WHERE invoice_id = ?`).run(linkedInvoiceId)
            db.prepare(`UPDATE shipments SET invoice_id = NULL, invoice_number = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(shipmentId)
          }

          for (const item of items) {
            if (item.serial_numbers) {
              try {
                const barcodes = JSON.parse(item.serial_numbers) as string[]
                if (Array.isArray(barcodes) && barcodes.length > 0) {
                  const ph = barcodes.map(() => '?').join(',')
                  try {
                    db.prepare(`
                      UPDATE product_serial_numbers
                      SET shipment_id = NULL, status = 'in_stock', ready_for_shipment = 1, updated_at = CURRENT_TIMESTAMP
                      WHERE barcode IN (${ph}) AND product_id = ?
                    `).run(...barcodes, item.product_id)
                  } catch {
                    db.prepare(`
                      UPDATE product_serial_numbers
                      SET shipment_id = NULL, status = 'in_stock', ready_for_shipment = 1
                      WHERE barcode IN (${ph}) AND product_id = ?
                    `).run(...barcodes, item.product_id)
                  }
                }
              } catch (_) {}
            }
            db.prepare(`
              UPDATE products SET stock_amount = stock_amount + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(item.quantity, item.product_id)
          }

          const itemIds = items.map((i) => i.id)
          if (itemIds.length > 0) {
            const ph = itemIds.map(() => '?').join(',')
            db.prepare(`
              DELETE FROM account_transactions
              WHERE reference_type = 'shipment_item' AND reference_id IN (${ph})
            `).run(...itemIds)
          }

          const amount = shipment.final_amount ?? shipment.total_amount ?? 0
          if (amount > 0) {
            db.prepare(`
              UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(amount, shipment.customer_id)
          }

          db.prepare(`
            UPDATE shipments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?
          `).run(shipmentId)
        }

        db.prepare(`
          UPDATE shipments SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(shipmentId)
      }

      db.prepare(`DELETE FROM account_transactions WHERE account_id = ?`).run(accountId)
      db.prepare(`
        UPDATE accounts SET balance = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(accountId)
    })()

    return ok({ message: 'Cari ve sevkiyat girdi verileri silindi. Cari ayarları aynen kaldı.' })
  } catch (error: any) {
    return fail(error.message || 'İşlem başarısız', { status: 500 })
  }
})
