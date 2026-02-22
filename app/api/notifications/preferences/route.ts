import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

type PrefsBody = {
  criticalStock?: boolean
  shipmentApproved?: boolean
  newOrder?: boolean
  orderStatusChange?: boolean
  purchaseRequest?: boolean
}

/** GET: Giriş yapan kullanıcının bildirim tercihlerini döndürür (sunucu tarafı kaynak). */
export const GET = withAuth(async (_request: NextRequest, user) => {
  const db = getDatabase()
  const row = db.prepare(
    `SELECT critical_stock, shipment_approved, new_order, order_status_change, purchase_request
     FROM user_notification_preferences WHERE user_id = ?`
  ).get(user.userId) as { critical_stock: number; shipment_approved: number; new_order: number; order_status_change: number; purchase_request?: number } | undefined

  if (!row) {
    return ok({
      criticalStock: true,
      shipmentApproved: true,
      newOrder: true,
      orderStatusChange: false,
      purchaseRequest: true,
    })
  }
  return ok({
    criticalStock: row.critical_stock === 1,
    shipmentApproved: row.shipment_approved === 1,
    newOrder: row.new_order === 1,
    orderStatusChange: row.order_status_change === 1,
    purchaseRequest: (row.purchase_request ?? 1) === 1,
  })
})

/** PUT: Giriş yapan kullanıcının bildirim tercihlerini kaydeder. */
export const PUT = withAuth(async (request: NextRequest, user) => {
  let body: PrefsBody = {}
  try {
    body = (await request.json()) as PrefsBody
  } catch {
    return fail('Geçersiz JSON', { status: 400 })
  }

  const criticalStock = body.criticalStock !== undefined ? (body.criticalStock ? 1 : 0) : undefined
  const shipmentApproved = body.shipmentApproved !== undefined ? (body.shipmentApproved ? 1 : 0) : undefined
  const newOrder = body.newOrder !== undefined ? (body.newOrder ? 1 : 0) : undefined
  const orderStatusChange = body.orderStatusChange !== undefined ? (body.orderStatusChange ? 1 : 0) : undefined
  const purchaseRequest = body.purchaseRequest !== undefined ? (body.purchaseRequest ? 1 : 0) : undefined

  const db = getDatabase()
  const now = new Date().toISOString()
  const existing = db.prepare(
    'SELECT critical_stock, shipment_approved, new_order, order_status_change, purchase_request FROM user_notification_preferences WHERE user_id = ?'
  ).get(user.userId) as { critical_stock: number; shipment_approved: number; new_order: number; order_status_change: number; purchase_request?: number } | undefined

  const c = criticalStock ?? existing?.critical_stock ?? 1
  const s = shipmentApproved ?? existing?.shipment_approved ?? 1
  const n = newOrder ?? existing?.new_order ?? 1
  const o = orderStatusChange ?? existing?.order_status_change ?? 0
  const p = purchaseRequest ?? existing?.purchase_request ?? 1

  db.prepare(`
    INSERT INTO user_notification_preferences (user_id, critical_stock, shipment_approved, new_order, order_status_change, purchase_request, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      critical_stock = excluded.critical_stock,
      shipment_approved = excluded.shipment_approved,
      new_order = excluded.new_order,
      order_status_change = excluded.order_status_change,
      purchase_request = excluded.purchase_request,
      updated_at = excluded.updated_at
  `).run(user.userId, c, s, n, o, p, now)

  return ok(null, { message: 'Tercihler kaydedildi' })
})
