/**
 * Sipariş ve Destek (SSH) olaylarında Telegram / WhatsApp bildirimi.
 * app_settings: telegram_bot_token, telegram_chat_id, whatsapp_webhook_url, messaging_events
 */

import { getDatabase } from '@/lib/database/db'
import { sendTelegramMessage } from './telegram'

type OrderItem = {
  id?: string
  order_number?: string
  product_name?: string
  quantity?: number
  status?: string
  product_id?: string | null
  customer_name?: string
}

function getMessagingSettings(db: ReturnType<typeof getDatabase>) {
  const rows = db.prepare(`
    SELECT setting_key, setting_value FROM app_settings
    WHERE setting_key IN ('telegram_bot_token', 'telegram_chat_id', 'whatsapp_webhook_url', 'messaging_events')
  `).all() as Array<{ setting_key: string; setting_value: string | null }>
  const map: Record<string, string> = {}
  for (const r of rows) {
    if (r.setting_value != null) map[r.setting_key] = r.setting_value.trim()
  }
  return {
    telegramBotToken: map.telegram_bot_token || '',
    telegramChatId: map.telegram_chat_id || '',
    whatsappWebhookUrl: map.whatsapp_webhook_url || '',
    events: (map.messaging_events || 'order.created').split(',').map((e) => e.trim()).filter(Boolean),
  }
}

function formatOrderMessage(orders: OrderItem[]): string {
  const lines = [
    '<b>Yeni sipariş bildirimi</b>',
    '',
    ...orders.slice(0, 15).map((o) => {
      const qty = o.quantity ?? 1
      const name = (o.product_name || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const dealer = o.customer_name ? `[Bayi: ${o.customer_name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}] ` : ''
      return `• ${o.order_number || o.id || '-'} ${dealer}— ${name} x ${qty}`
    }),
  ]
  if (orders.length > 15) {
    lines.push(`... ve ${orders.length - 15} sipariş daha`)
  }
  return lines.join('\n')
}

export async function sendOrderNotificationToChannels(payload: { orders?: OrderItem[] }): Promise<void> {
  const orders = payload?.orders
  if (!orders || !Array.isArray(orders) || orders.length === 0) return

  try {
    const db = getDatabase()
    const { telegramBotToken, telegramChatId, whatsappWebhookUrl, events } = getMessagingSettings(db)
    if (!events.includes('order.created')) return

    const text = formatOrderMessage(orders)

    if (telegramBotToken && telegramChatId) {
      const result = await sendTelegramMessage(telegramBotToken, telegramChatId, text)
      if (!result.ok) {
        console.error('[Messaging] Telegram:', result.error)
      }
    }

    if (whatsappWebhookUrl) {
      try {
        await fetch(whatsappWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'order.created', message: text, orders }),
        })
      } catch (e) {
        console.error('[Messaging] WhatsApp webhook:', e)
      }
    }
  } catch (e) {
    console.error('[Messaging] sendOrderNotificationToChannels:', e)
  }
}

/** Bayi portalından sipariş iptal edildiğinde Telegram bildirimi */
export async function sendOrderCancelledByDealerNotification(payload: {
  order_number: string
  dealer_name: string
  product_name?: string
}): Promise<void> {
  try {
    const db = getDatabase()
    const { telegramBotToken, telegramChatId } = getMessagingSettings(db)
    if (!telegramBotToken || !telegramChatId) return

    const product = (payload.product_name || 'Sipariş').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const dealer = (payload.dealer_name || 'Bayi').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const text = [
      '<b>🚫 Bayi Sipariş İptali</b>',
      '',
      `📋 <b>Sipariş No:</b> ${(payload.order_number || '-').replace(/</g, '&lt;')}`,
      `👤 <b>Bayi:</b> ${dealer}`,
      `📦 <b>Ürün:</b> ${product}`,
      '',
      '<i>Bayi portalından iptal edilmiştir.</i>'
    ].join('\n')

    const result = await sendTelegramMessage(telegramBotToken, telegramChatId, text)
    if (!result.ok) console.error('[Messaging] Telegram (order cancelled):', result.error)
  } catch (e) {
    console.error('[Messaging] sendOrderCancelledByDealerNotification:', e)
  }
}

export async function sendTicketNotificationToChannels(payload: {
  ticketNumber: string,
  subject: string,
  dealerName: string,
  priority: string
}): Promise<void> {
  try {
    const db = getDatabase()
    const { telegramBotToken, telegramChatId } = getMessagingSettings(db)

    const priorityEmoji: Record<string, string> = {
      'low': '🔵',
      'medium': '🟡',
      'high': '🟠',
      'critical': '🔴'
    }

    const text = [
      '<b>📢 Yeni Servis Talebi (SSH)</b>',
      '',
      `👤 <b>Bayi:</b> ${payload.dealerName}`,
      `🎫 <b>No:</b> ${payload.ticketNumber}`,
      `📌 <b>Konu:</b> ${payload.subject}`,
      `⚠️ <b>Öncelik:</b> ${priorityEmoji[payload.priority] || '⚪'} ${payload.priority.toUpperCase()}`,
      '',
      '<i>Asistan üzerinden detaylara ulaşabilirsiniz.</i>'
    ].join('\n')

    if (telegramBotToken && telegramChatId) {
      await sendTelegramMessage(telegramBotToken, telegramChatId, text)
    }
  } catch (e) {
    console.error('[Messaging] sendTicketNotificationToChannels:', e)
  }
}
