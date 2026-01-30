import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'
import { getAccessTokenFromRequest } from '@/lib/auth/session'
import { verifyAccessToken } from '@/lib/auth/jwt'
import { loadUserPermissions } from '@/lib/auth/permissions'

// GET: Mevcut kullanıcı bilgilerini getir
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const token = getAccessTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Kullanıcı kimliği gerekli' }, { status: 401 })
    }
    const payload = await verifyAccessToken(token).catch (() => null)
    const userId = payload?.userId
    if (!userId) {
      return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
    }

    const db = getDatabase()

    const user = db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.role,
        u.job_title,
        u.is_approved,
        u.created_at,
        u.last_login
      FROM users u
      WHERE u.id = ? AND u.company_id = ? AND u.branch_id = ?
        AND u.deleted_at IS NULL
    `).get(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as any

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // İzinleri getir
    const permissions = loadUserPermissions(db, userId)

    return NextResponse.json({
      ...user,
      permissions,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// PATCH: Mevcut kullanıcı profilini güncelle
export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const token = getAccessTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Kullanıcı kimliği gerekli' }, { status: 401 })
    }
    const payload = await verifyAccessToken(token).catch(() => null)
    const userId = payload?.userId
    if (!userId) {
      return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
    }

    const body = await request.json()
    const { email, full_name, job_title } = body

    const db = getDatabase()

    // Kullanıcıyı bul
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND company_id = ? AND branch_id = ? AND deleted_at IS NULL')
      .get(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as any
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Profil bilgilerini güncelle
    let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP'
    const updateParams: any[] = []

    if (email !== undefined) {
      updateQuery += ', email = ?'
      updateParams.push(email || null)
    }

    if (full_name !== undefined) {
      updateQuery += ', full_name = ?'
      updateParams.push(full_name)
    }

    if (job_title !== undefined) {
      updateQuery += ', job_title = ?'
      updateParams.push(job_title)
    }

    updateQuery += ' WHERE id = ? AND company_id = ? AND branch_id = ?'
    updateParams.push(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

    db.prepare(updateQuery).run(...updateParams)

    return NextResponse.json({
      success: true,
      message: 'Profil başarıyla güncellendi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

