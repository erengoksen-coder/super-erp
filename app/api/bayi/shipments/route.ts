import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'

/**
 * Bayi kullanıcısının cari adına ait sevkiyatlar.
 * Cari hesap adı (accounts.name) = kullanıcının dealer_name ile eşleşir.
 */
export const GET = withAuth(async (request: NextRequest, user: { userId: string; role: string }) => {
  const normalizedRole = (user.role || '').toString().trim().toLowerCase()
  if (normalizedRole !== 'bayi') {
    return fail('Bu alan sadece bayi kullanıcıları içindir', { status: 403 })
  }

  const db = getDatabase()
  const u = db.prepare('SELECT dealer_name FROM users WHERE id = ? AND deleted_at IS NULL').get(user.userId) as { dealer_name: string | null } | undefined
  const dealerName = (u?.dealer_name || '').trim()
  if (!dealerName) {
    return ok([])
  }

  const account = db.prepare(`
    SELECT id FROM accounts WHERE TRIM(name) = ? AND (deleted_at IS NULL OR deleted_at = '')
  `).get(dealerName) as { id: string } | undefined

  if (!account) {
    return ok([])
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  let query = `
    SELECT 
      s.id, s.shipment_number, s.customer_id, s.shipment_date, s.status,
      s.total_quantity, s.total_amount, s.tax_rate, s.tax_amount, s.final_amount, s.notes, s.created_at,
      a.name as customer_name, a.code as customer_code
    FROM shipments s
    JOIN accounts a ON s.customer_id = a.id
    WHERE s.customer_id = ? AND (s.deleted_at IS NULL OR s.deleted_at = '')
  `
  const params: string[] = [account.id]

  if (status && status.trim()) {
    query += ' AND s.status = ?'
    params.push(status.trim())
  }

  query += ' ORDER BY s.shipment_date DESC, s.created_at DESC'

  const shipments = db.prepare(query).all(...params) as any[]

  const shipmentsWithItems = shipments.map((shipment) => {
    const items = db.prepare(`
      SELECT si.id, si.product_id, si.quantity, si.unit_price, si.total_price, si.serial_numbers, si.notes,
             p.name as product_name, p.sku as product_sku
      FROM shipment_items si
      JOIN active_products p ON si.product_id = p.id
      WHERE si.shipment_id = ? AND (si.deleted_at IS NULL OR si.deleted_at = '')
      ORDER BY si.created_at
    `).all(shipment.id) as any[]
    return { ...shipment, items }
  })

  return ok(shipmentsWithItems, { headers: CACHE_HEADERS_SHORT })
})
