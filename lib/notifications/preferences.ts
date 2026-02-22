/**
 * Sunucu tarafında bildirim tercihleri.
 * Hangi kullanıcıların hangi bildirim türünü almak istediği DB'den okunur.
 */

import type Database from 'better-sqlite3'

export type NotificationPreferenceKey =
  | 'critical_stock'
  | 'shipment_approved'
  | 'new_order'
  | 'order_status_change'
  | 'purchase_request'

const COLUMN_MAP: Record<NotificationPreferenceKey, string> = {
  critical_stock: 'critical_stock',
  shipment_approved: 'shipment_approved',
  new_order: 'new_order',
  order_status_change: 'order_status_change',
  purchase_request: 'purchase_request',
}

/**
 * Verilen bildirim türünü almak isteyen kullanıcı ID'lerini döndürür.
 * Tercih kaydı yoksa veya 1 ise alır; 0 ise almaz.
 */
export function getUserIdsWantingNotification(
  db: Database.Database,
  preferenceKey: NotificationPreferenceKey
): string[] {
  const col = COLUMN_MAP[preferenceKey]
  const sql = `SELECT u.id FROM users u LEFT JOIN user_notification_preferences p ON p.user_id = u.id WHERE u.deleted_at IS NULL AND (p.user_id IS NULL OR p.${col} = 1)`
  const rows = db.prepare(sql).all() as Array<{ id: string }>
  return rows.map((r) => r.id)
}

/**
 * Tek kullanıcının bu bildirim türünü alıp almak istemediğini döndürür.
 * Tercih yoksa true (varsayılan: al).
 */
export function userWantsNotification(
  db: Database.Database,
  userId: string,
  preferenceKey: NotificationPreferenceKey
): boolean {
  const col = COLUMN_MAP[preferenceKey]
  const row = db
    .prepare(
      `SELECT ${col} AS val FROM user_notification_preferences WHERE user_id = ?`
    )
    .get(userId) as { val: number } | undefined
  if (!row) return true
  return row.val === 1
}
