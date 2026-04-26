import { getDatabase } from '@/lib/database/db'

/**
 * Gönderilecek webhook olay tipleri
 */
export type WebhookEvent = 
  | 'order.created' 
  | 'order.updated' 
  | 'order.cancelled'
  | 'stock.movement'
  | 'stock.low'
  | 'production.started'
  | 'production.completed'
  | 'invoice.issued'
  | 'shipment.approved'
  | 'shipment.created'

/**
 * Webhook olayını tüm kayıtlı ve aktif URL'lere asenkron olarak gönderir.
 */
export async function dispatchWebhook(event: WebhookEvent, payload: any) {
  try {
    const db = getDatabase()
    
    // Aktif ve bu olayı dinleyen webhook'ları getir
    const webhooks = db.prepare(`
      SELECT url, secret_key, event_types 
      FROM webhooks 
      WHERE is_active = 1
    `).all() as Array<{ url: string, secret_key: string | null, event_types: string }>

    const matchedWebhooks = webhooks.filter(wh => {
      try {
        const types = JSON.parse(wh.event_types)
        return Array.isArray(types) && (types.includes(event) || types.includes('*'))
      } catch {
        return false
      }
    })

    if (matchedWebhooks.length === 0) return

    // Her birine asenkron isteği başlat
    const timestamp = new Date().toISOString()
    const body = JSON.stringify({
      event,
      timestamp,
      payload
    })

    const promises = matchedWebhooks.map(async (wh) => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-SuperERP-Event': event,
          'X-SuperERP-Timestamp': timestamp,
        }

        // Eğer secret key varsa imza ekle (Basit HMAC simülasyonu veya direkt header)
        if (wh.secret_key) {
          headers['X-SuperERP-Signature'] = wh.secret_key 
        }

        const response = await fetch(wh.url, {
          method: 'POST',
          headers,
          body,
          // 5 saniye timeout
          signal: AbortSignal.timeout(5000)
        })

        if (!response.ok) {
          console.warn(`[Webhook] Gönderim başarısız: ${wh.url} (Status: ${response.status})`)
        }
      } catch (err: any) {
        console.error(`[Webhook] Hata (${wh.url}):`, err.message)
      }
    })

    // İsteği arka planda bitir (await etmiyoruz ki API bekletilmesin, 
    // ama Node.js ortamında dangling promise riskine karşı Promise.allSettled kullanabiliriz)
    void Promise.allSettled(promises)

  } catch (error: any) {
    console.error('[Webhook Dispatcher] Kritik Hata:', error.message)
  }
}
