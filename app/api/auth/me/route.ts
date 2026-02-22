import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { getDatabase } from '@/lib/database/db'
import { getAccessTokenFromRequest } from '@/lib/auth/session'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { loadUserPermissions } from '@/lib/auth/permissions'

type UserRow = {
  id: string
  username: string
  email: string | null
  full_name: string | null
  role: string
  position: string | null
  job_title: string | null
  is_approved: number
  is_locked: number
  dealer_name: string | null
  can_export?: number
  max_export_rows?: number | null
  view_only?: number
}

// GET: Mevcut kullanıcı bilgileri
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const token = getAccessTokenFromRequest(request)
    if (!token) {
      return fail('Token gerekli', { status: 401 })
    }

    const payload = await verifyAccessToken(token).catch(() => null)
    if (!payload?.userId) {
      return fail('Geçersiz token', { status: 401 })
    }

    const db = getDatabase()
    const userId = payload.userId

    const user = db.prepare(`
      SELECT id, username, email, full_name, role, position, job_title, is_approved, COALESCE(is_locked, 0) as is_locked, dealer_name,
        COALESCE(can_export, 1) as can_export, max_export_rows, COALESCE(view_only, 0) as view_only
      FROM users
      WHERE id = ? AND is_approved = 1 AND deleted_at IS NULL
    `).get(userId) as UserRow | undefined

    if (!user) {
      return fail('Kullanıcı bulunamadı veya onaylanmamış', { status: 401 })
    }

    if (user.is_locked) {
      return fail('Hesabınız kilitlendi. Yönetici ile iletişime geçin.', { status: 403 })
    }

    // Çevrimiçi sayılmak için son aktiviteyi güncelle (admin kullanıcı listesinde "Çevrimiçi" görünsün)
    try {
      db.prepare('UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE id = ?').run(userId)
    } catch {}

    const permissions = loadUserPermissions(db, userId)

    return ok({
      user: {
        ...user,
        permissions,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sunucu hatası'
    const { apiLogger } = await import('@/lib/api/logger')
    apiLogger.error('Auth me failed', { error: message })
    return fail(message, { status: 500 })
  }
})
