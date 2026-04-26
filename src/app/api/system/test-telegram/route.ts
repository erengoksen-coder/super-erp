import { NextRequest } from 'next/server'
import { TelegramService } from '@/lib/notifications/telegram'
import { ok, fail } from '@/lib/api/response'
import { verifyToken } from '@/lib/auth/jwt'

// POST: Send a test Telegram message
export async function GET(request: NextRequest) {
  try {
    // 1. Authorization Check (Admin only)
    const token = request.cookies.get('auth-token')?.value 
      || request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return fail('Yetkisiz erişim', { status: 401 })
    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') return fail('Admin yetkisi gerekli', { status: 403 })

    // 2. Send Test Alert
    const result = await TelegramService.sendAlert(
      'BAĞLANTI TESTİ BAŞARILI',
      'Super ERP Zenith - Agi-OS Link Telegram entegrasyonu başarıyla doğrulandı. Artık kritik olaylar cebinize bildirim olarak gelecektir.',
      'INFO'
    )

    if (result.ok) {
      return ok({ success: true, message: 'Test mesajı gönderildi' })
    } else {
      return fail(result.error || 'Mesaj gönderilemedi', { status: 400 })
    }

  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}
