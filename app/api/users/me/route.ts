import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'
import { createHash } from 'crypto'

// GET: Mevcut kullanıcı bilgilerini getir
export async function GET(request: NextRequest) {
  try {
    // Authorization header'dan kullanıcı ID'sini al (basit implementasyon)
    // Production'da JWT token kullanılmalı
    const authHeader = request.headers.get('authorization')
    const userId = request.headers.get('x-user-id') || authHeader?.replace('Bearer ', '')

    if (!userId) {
      return NextResponse.json(
        { error: 'Kullanıcı kimliği gerekli' },
        { status: 401 }
      )
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
    `).get(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as any

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // İzinleri getir
    const permissions = db.prepare(`
      SELECT page_path, can_view, can_create, can_edit, can_delete
      FROM user_permissions
      WHERE user_id = ? AND company_id = ? AND branch_id = ?
    `).all(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

    return NextResponse.json({
      ...user,
      permissions,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Mevcut kullanıcı profilini güncelle
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const userId = request.headers.get('x-user-id') || authHeader?.replace('Bearer ', '')

    if (!userId) {
      return NextResponse.json(
        { error: 'Kullanıcı kimliği gerekli' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email, full_name, job_title } = body

    const db = getDatabase()

    // Kullanıcıyı bul
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND company_id = ? AND branch_id = ?')
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
}

