import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { logAudit } from '@/lib/audit'

/**
 * POST: Sevkiyata verilen verileri temizle.
 * product_serial_numbers'da shipment_id dolu olan tüm barkodları
 * sevkiyattan çıkarır: shipment_id = NULL, status = 'in_stock', ready_for_shipment = 1.
 * Böylece siparişler "Sevk Edilen" yerine "Tamamlanan"da görünür.
 * Body: { "confirm": true } gerekli.
 */
export const POST = withAuth(
  async (request: NextRequest, user) => {
    try {
      const body = await request.json().catch(() => ({})) as { confirm?: boolean }
      if (body?.confirm !== true) {
        return fail('Onay için body\'de { "confirm": true } gönderin.', { status: 400 })
      }

      const db = getDatabase()

      const countRow = db.prepare(`
        SELECT COUNT(*) as n FROM product_serial_numbers WHERE shipment_id IS NOT NULL AND TRIM(shipment_id) != ''
      `).get() as { n: number }
      const affectedCount = countRow?.n ?? 0

      db.prepare(`
        UPDATE product_serial_numbers
        SET shipment_id = NULL, status = 'in_stock', ready_for_shipment = 1, updated_at = CURRENT_TIMESTAMP
        WHERE shipment_id IS NOT NULL AND TRIM(shipment_id) != ''
      `).run()

      logAudit(db, {
        tableName: 'admin_operation',
        action: 'update',
        recordId: 'clear-shipment-data',
        userId: user.userId,
        after: { cleared_barcodes: affectedCount },
      })

      return ok({
        message: `Sevkiyata verilen veriler temizlendi. ${affectedCount} barkod sevkiyattan çıkarıldı.`,
        cleared_barcodes: affectedCount,
      })
    } catch (error: any) {
      return fail(error?.message || 'İşlem başarısız', { status: 500 })
    }
  },
  ['admin']
)
