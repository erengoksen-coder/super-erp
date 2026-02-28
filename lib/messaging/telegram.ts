/**
 * Telegram Bot API ile mesaj gönderimi.
 * Bot token ve chat_id app_settings üzerinden alınır.
 */

const TELEGRAM_API = 'https://api.telegram.org'

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  options?: { disable_web_page_preview?: boolean; parse_mode?: 'HTML' | 'Markdown' }
): Promise<{ ok: boolean; error?: string }> {
  const token = (botToken || '').trim()
  const chat = (chatId || '').trim()
  if (!token || !chat) {
    return { ok: false, error: 'Telegram bot token veya chat id eksik' }
  }
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text,
        parse_mode: options?.parse_mode ?? 'HTML',
        disable_web_page_preview: options?.disable_web_page_preview ?? true,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!data.ok) {
      return { ok: false, error: data.description || res.statusText || 'Telegram API hatası' }
    }
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}
