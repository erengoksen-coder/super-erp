import { getDatabase } from '@/lib/database/db'

/**
 * Agi-OS Link: Telegram Notification Service
 * 
 * Provides real-time connectivity between the ERP core 
 * and the administrator's Telegram account.
 */
export class TelegramService {
  /**
   * Send a formatted message to the configured Telegram chat.
   */
  static async sendMessage(text: string) {
    try {
      const db = getDatabase()
      
      // Get settings from the 'settings' table (standard UI-managed table)
      const rows = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_bot_token') as { value: string } | undefined
      const token = rows?.value
      
      const chatRows = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_chat_id') as { value: string } | undefined
      const chatId = chatRows?.value

      if (!token || !chatId || token === 'YOUR_BOT_TOKEN' || chatId === 'YOUR_CHAT_ID') {
        return { ok: false, error: 'Telegram not configured' }
      }

      const url = `https://api.telegram.org/bot${token}/sendMessage`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      })

      const result = await response.json()
      return { ok: result.ok, error: result.description }

    } catch (error: any) {
      console.error('[TelegramService] Send failed:', error.message)
      return { ok: false, error: error.message }
    }
  }

  /**
   * Send a standardized "Agi-OS Zenith" alert.
   */
  static async sendAlert(title: string, details: string, type: 'INFO' | 'URGENT' | 'SECURITY' = 'INFO') {
    const icon = type === 'SECURITY' ? '🛡️' : type === 'URGENT' ? '🚨' : 'ℹ️'
    const message = `
<b>${icon} Agi-OS ZENITH ALERT</b>
━━━━━━━━━━━━━━━━━━━━
<b>BAŞLIK:</b> ${title}
<b>DETAY:</b> ${details}
<b>ZAMAN:</b> ${new Date().toLocaleString('tr-TR')}
━━━━━━━━━━━━━━━━━━━━
<i>Bu mesaj Super ERP tarafından otomatik gönderilmiştir.</i>
    `.trim()

    return this.sendMessage(message)
  }
}
