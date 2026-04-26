import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { getDatabase } from '@/lib/database/db'
import { getAuthUserPayload } from '@/lib/auth/session'
import { handleApi } from '@/lib/api/handler'
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
  company_id: string
  branch_id: string
}

// GET: Mevcut kullanıcı bilgileri
export const GET = withAuth(async (request: NextRequest) => {
  return handleApi(async () => {
    const payload = await getAuthUserPayload(request)
    if (!payload?.userId) {
      return fail('Geçersiz token', { status: 401 })
    }

    const db = getDatabase()
    const userId = payload.userId

    const user = db.prepare(`
      SELECT id, username, email, full_name, role, position, job_title, is_approved, COALESCE(is_locked, 0) as is_locked, dealer_name, company_id, branch_id
      FROM users
      WHERE id = ? AND is_approved = 1 AND deleted_at IS NULL
    `).get(userId) as UserRow | undefined

    if (!user) {
      return fail('Kullanıcı bulunamadı veya onaylanmamış', { status: 401 })
    }

    if (user.is_locked) {
      return fail('Hesabınız kilitlendi. Yönetici ile iletişime geçin.', { status: 403 })
    }

    // Çevrimiçi sayılmak için son aktiviteyi güncelle
    try {
      db.prepare('UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE id = ?').run(userId)
    } catch {}

    const permissions = loadUserPermissions(db, userId)

    // Puantaj için: kullanıcı e-postası ile eşleşen çalışan
    const employee = db.prepare(`
      SELECT id FROM hr_employees WHERE email = ? AND deleted_at IS NULL AND status = 'active'
    `).get(user.email || '') as { id: string } | undefined
    const employee_id = employee?.id ?? null

    return ok({
      user: {
        ...user,
        permissions,
        employee_id,
      },
    })
  })
})
