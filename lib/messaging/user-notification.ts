
/**
 * Yeni kullanıcı kaydı olaylarında Telegram bildirimi.
 */

import { getDatabase } from '@/lib/database/db'
import { sendTelegramMessage } from './telegram'

function getMessagingSettings(db: ReturnType<typeof getDatabase>) {
    const rows = db.prepare(`
    SELECT setting_key, setting_value FROM app_settings
    WHERE setting_key IN ('telegram_bot_token', 'telegram_chat_id')
  `).all() as Array<{ setting_key: string; setting_value: string | null }>
    const map: Record<string, string> = {}
    for (const r of rows) {
        if (r.setting_value != null) map[r.setting_key] = r.setting_value.trim()
    }
    return {
        telegramBotToken: map.telegram_bot_token || '',
        telegramChatId: map.telegram_chat_id || '',
    }
}

export async function sendUserRegistrationNotification(user: {
    username: string
    email?: string | null
    full_name?: string | null
    role: string
    method: 'form' | 'google'
}): Promise<void> {
    try {
        const db = getDatabase()
        const { telegramBotToken, telegramChatId } = getMessagingSettings(db)

        if (!telegramBotToken || !telegramChatId) return

        const methodLabel = user.method === 'google' ? 'Google ile' : 'Kayıt Formu ile'
        const text = [
            '<b>👤 Yeni Kullanıcı Kaydı</b>',
            '',
            `👤 <b>Kullanıcı:</b> ${user.username}`,
            user.full_name ? `📛 <b>Ad Soyad:</b> ${user.full_name}` : null,
            user.email ? `📧 <b>E-posta:</b> ${user.email}` : null,
            `🔑 <b>Rol:</b> ${user.role.toUpperCase()}`,
            `🌐 <b>Yöntem:</b> ${methodLabel}`,
            '',
            '<i>Admin paneli üzerinden kullanıcıyı onaylayabilirsiniz.</i>'
        ].filter(Boolean).join('\n')

        await sendTelegramMessage(telegramBotToken, telegramChatId, text)
    } catch (e) {
        console.error('[Messaging] sendUserRegistrationNotification:', e)
    }
}
