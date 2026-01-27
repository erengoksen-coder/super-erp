import { getDatabase } from '@/lib/database/db'

export type PushSubscriptionRow = {
  id: string
  user_id: string | null
  endpoint: string
  p256dh: string
  auth: string
}

export const pushSubscriptionsRepo = {
  upsert(data: {
    id: string
    user_id: string | null
    endpoint: string
    p256dh: string
    auth: string
  }) {
    const db = getDatabase()
    db.prepare(`
      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth
    `).run(
      data.id,
      data.user_id,
      data.endpoint,
      data.p256dh,
      data.auth
    )
  },

  removeByEndpoint(endpoint: string) {
    const db = getDatabase()
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint)
  },

  removeById(id: string) {
    const db = getDatabase()
    db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(id)
  },

  list() {
    const db = getDatabase()
    return db.prepare(`
      SELECT id, user_id, endpoint, p256dh, auth
      FROM push_subscriptions
    `).all() as PushSubscriptionRow[]
  },
}
