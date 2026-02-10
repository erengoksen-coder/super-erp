import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { sendEmail } from '@/lib/notifications/send'
import { fillTemplate, emailTemplates } from '@/lib/notifications/templates'
import { ok, fail } from '@/lib/api/response'

const TOKEN_VALID_HOURS = 1

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request).catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    if (!email) {
      return fail('E-posta adresi gerekli', { status: 400 })
    }

    const db = getDatabase()
    const user = db.prepare('SELECT id, username FROM users WHERE email = ? AND deleted_at IS NULL AND is_approved = 1').get(email) as { id: string; username: string } | undefined
    if (!user) {
      return ok({ message: 'Bu e-posta kayıtlı değilse bildirim gönderilmeyecektir.' })
    }

    const token = randomUUID()
    const expiresAt = new Date(Date.now() + TOKEN_VALID_HOURS * 60 * 60 * 1000).toISOString()
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id)
    db.prepare('INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expiresAt)

    const host = request.headers.get('host') || request.headers.get('x-forwarded-host') || 'localhost:3000'
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
    const baseUrl = process.env.APP_PUBLIC_URL || `${proto}://${host}`
    const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`

    const subject = emailTemplates.passwordReset.subject
    const text = fillTemplate(emailTemplates.passwordReset.text, { resetUrl })
    const html = fillTemplate(emailTemplates.passwordReset.html, { resetUrl })
    const result = await sendEmail({ to: email, subject, text, html })
    if (!result.ok) {
      return fail(result.error || 'E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.', { status: 500 })
    }
    return ok({ message: 'Şifre sıfırlama linki e-posta adresinize gönderildi.' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'İşlem başarısız'
    return fail(message, { status: 500 })
  }
}
