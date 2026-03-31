import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase, getSetting, setSetting } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { sendTelegramMessage } from '@/lib/messaging/telegram'

const KEYS = ['telegram_bot_token', 'telegram_chat_id', 'whatsapp_webhook_url', 'messaging_events'] as const


// GET: Telegram / WhatsApp bildirim ayarları (token maskeli)
export const GET = withAuth(async () => {
  try {
    const db = getDatabase()
    const telegramBotToken = getSetting(db, 'telegram_bot_token')
    const telegramChatId = getSetting(db, 'telegram_chat_id')
    const whatsappWebhookUrl = getSetting(db, 'whatsapp_webhook_url')
    const messagingEvents = getSetting(db, 'messaging_events') || 'order.created'
    return ok({
      telegram_bot_token: telegramBotToken ? `${telegramBotToken.slice(0, 8)}…` : '',
      telegram_chat_id: telegramChatId,
      whatsapp_webhook_url: whatsappWebhookUrl,
      messaging_events: messagingEvents,
      telegram_configured: !!(telegramBotToken && telegramChatId),
    })
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : 'Ayarlar okunamadı', { status: 500 })
  }
})

// PATCH: Telegram / WhatsApp ayarlarını güncelle (admin/yetkili kullanıcı)
export const PATCH = withAuth(async (request: NextRequest, user: { userId: string; role?: string }) => {
  const role = (user?.role ?? '').toString().trim().toLowerCase()
  if (role === 'bayi') {
    return fail('Bu ayarları değiştirme yetkiniz yok', { status: 403 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const db = getDatabase()

    if (typeof body.telegram_bot_token === 'string') {
      setSetting(db, 'telegram_bot_token', body.telegram_bot_token.trim())
    }
    if (typeof body.telegram_chat_id === 'string') {
      setSetting(db, 'telegram_chat_id', body.telegram_chat_id.trim())
    }
    if (typeof body.whatsapp_webhook_url === 'string') {
      setSetting(db, 'whatsapp_webhook_url', body.whatsapp_webhook_url.trim())
    }
    if (typeof body.messaging_events === 'string') {
      setSetting(db, 'messaging_events', body.messaging_events.trim() || 'order.created')
    }

    return ok({ message: 'Kaydedildi' })
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : 'Kayıt başarısız', { status: 500 })
  }
})

// POST: Test mesajı gönder (Telegram)
export const POST = withAuth(async (_request: NextRequest, user: { userId: string; role?: string }) => {
  const role = (user?.role ?? '').toString().trim().toLowerCase()
  if (role === 'bayi') {
    return fail('Bu işlem için yetkiniz yok', { status: 403 })
  }
  try {
    const db = getDatabase()
    const token = getSetting(db, 'telegram_bot_token')
    const chatId = getSetting(db, 'telegram_chat_id')
    if (!token || !chatId) {
      return fail('Önce Telegram Bot Token ve Chat ID kaydedin', { status: 400 })
    }
    const text = '<b>Test bildirimi</b>\n\nLIVASOFA ERP sipariş bildirim entegrasyonu çalışıyor.'
    const result = await sendTelegramMessage(token, chatId, text)
    if (!result.ok) {
      return fail(result.error || 'Telegram mesajı gönderilemedi', { status: 502 })
    }
    return ok({ message: 'Test mesajı gönderildi' })
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : 'Test mesajı gönderilemedi', { status: 500 })
  }
})
