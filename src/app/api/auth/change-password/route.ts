import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { ok, fail } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { commonSchemas } from '@/lib/validation/schemas'

/** POST: Giriş yapmış kullanıcı kendi şifresini değiştirir. Body: { currentPassword, newPassword } */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await parseJsonBody(request).catch(() => null)
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
    if (!currentPassword) {
      return fail('Mevcut şifre gerekli', { status: 400 })
    }
    const parsed = commonSchemas.password.safeParse(newPassword)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Yeni şifre en az 6 karakter olmalıdır'
      return fail(msg, { status: 400 })
    }
    const db = getDatabase()
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.userId) as { password_hash: string } | undefined
    if (!row) {
      return fail('Kullanıcı bulunamadı', { status: 404 })
    }
    if (!verifyPassword(currentPassword, row.password_hash)) {
      return fail('Mevcut şifre hatalı', { status: 401 })
    }
    const hashed = hashPassword(parsed.data)
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, user.userId)
    return ok({ message: 'Şifreniz güncellendi.' })
  } catch (e) {
    const { apiLogger } = await import('@/lib/api/logger')
    apiLogger.error('Change-password failed', { error: e instanceof Error ? e.message : String(e), userId: user.userId })
    return fail(e instanceof Error ? e.message : 'Şifre güncellenirken hata oluştu', { status: 500 })
  }
})
