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

    const permissions = loadUserPermissions(db, userId)

    return NextResponse.json({
      user: {
        ...user,
        permissions,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
