import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { hashPassword } from '@/lib/auth/password'
import { ok, fail } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request).catch(() => null)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
    if (!token) {
      return fail('Token gerekli', { status: 400 })
    }
    if (!newPassword || newPassword.length < 8) {
      return fail('Yeni şifre en az 8 karakter olmalıdır', { status: 400 })
    }

    const db = getDatabase()
    const row = db.prepare(`
      SELECT token, user_id, expires_at FROM password_reset_tokens WHERE token = ?
    `).get(token) as { token: string; user_id: string; expires_at: string } | undefined
    if (!row) {
      return fail('Geçersiz veya süresi dolmuş link', { status: 400 })
    }
    if (new Date(row.expires_at) < new Date()) {
      db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token)
      return fail('Linkin süresi dolmuş. Lütfen yeni talep oluşturun.', { status: 400 })
    }

    const hashed = hashPassword(newPassword)
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, row.user_id)
    db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token)
    return ok({ message: 'Şifreniz güncellendi. Giriş yapabilirsiniz.' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    const turkishMessage =
      msg.includes('password') || msg.includes('column')
        ? 'Veritabanı hatası. Lütfen yönetici ile iletişime geçin.'
        : msg || 'Şifre güncellenirken bir hata oluştu.'
    return fail(turkishMessage, { status: 500 })
  }
}
