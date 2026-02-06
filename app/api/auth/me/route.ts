import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { getAccessTokenFromRequest } from '@/lib/auth/session'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { loadUserPermissions } from '@/lib/auth/permissions'

// GET: Mevcut kullanıcı bilgileri
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const token = getAccessTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Token gerekli' }, { status: 401 })
    }

    const payload = await verifyAccessToken(token).catch(() => null)
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
    }

    const db = getDatabase()
    const userId = payload.userId

    const user = db.prepare(`
      SELECT id, username, email, full_name, role, job_title, is_approved
      FROM users
      WHERE id = ? AND is_approved = 1 AND deleted_at IS NULL
    `).get(userId) as any

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı veya onaylanmamış' },
        { status: 401 }
      )
    }

    // Çevrimiçi sayılmak için son aktiviteyi güncelle (admin kullanıcı listesinde "Çevrimiçi" görünsün)
    try {
      db.prepare('UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE id = ?').run(userId)
    } catch {}

    const permissions = loadUserPermissions(db, userId)

    // Puantaj için: kullanıcı e-postası ile eşleşen çalışan
    const employee = db.prepare(`
      SELECT id FROM hr_employees WHERE email = ? AND deleted_at IS NULL AND status = 'active'
    `).get(user.email || '') as { id: string } | undefined
    const employee_id = employee?.id ?? null

    return NextResponse.json({
      user: {
        ...user,
        permissions,
        employee_id,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
