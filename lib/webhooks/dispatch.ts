import { getDatabase } from '@/lib/database/db'

export type WebhookEvent =
  | 'order.created'
  | 'order.updated'
  | 'shipment.approved'
  | 'shipment.created'
  | 'invoice.issued'
  | 'stock.low'
  | 'production.started'
  | 'production.completed'

type WebhookEndpoint = {
  id: string
  url: string
  events: string | null
  secret: string | null
  active: number
}

/**
 * Olay için kayıtlı webhook URL'lerine POST atar (fire-and-forget).
 * events alanı boşsa tüm olaylara abone; doluysa virgülle ayrılmış liste (örn. "order.created,shipment.approved").
 */
export async function dispatchWebhook(event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
  try {
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT id, url, events, secret, active FROM webhook_endpoints WHERE active = 1
    `).all() as WebhookEndpoint[]

    const body = {
      event,
      payload,
      timestamp: new Date().toISOString(),
    }

    for (const row of rows) {
      const events = row.events ? row.events.split(',').map((e) => e.trim()) : null
      if (events && !events.includes(event)) continue

      const url = row.url.trim()
      if (!url) continue

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          ...(row.secret ? { 'X-Webhook-Signature': row.secret } : {}),
        },
        body: JSON.stringify(body),
      }).catch((err) => {
        console.error('[Webhook] POST failed:', url, err?.message || err)
      })
    }

    // Telegram / WhatsApp sipariş bildirimi (order.created)
    if (event === 'order.created' && payload && typeof payload === 'object') {
      import('@/lib/messaging/order-notification').then(({ sendOrderNotificationToChannels }) => {
        sendOrderNotificationToChannels(payload as { orders?: unknown[] }).catch((err) => {
          console.error('[Webhook] Messaging (Telegram/WhatsApp):', err)
        })
      }).catch(() => {})
    }
  } catch (e) {
    console.error('[Webhook] dispatch error:', e)
  }
}
