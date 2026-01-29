import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'
import { getAccessTokenFromRequest } from '@/lib/auth/session'
import { verifyAccessToken } from '@/lib/auth/jwt'

// GET: Mevcut kullanıcı bilgileri
export async function GET(request: NextRequest) {
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

    // İzinleri getir
    const permissions = db.prepare(`
      SELECT page_path, can_view, can_create, can_edit, can_delete
      FROM user_permissions
      WHERE user_id = ? AND company_id = ? AND branch_id = ?
    `).all(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

    const rolePermissions = db.prepare(`
      SELECT rp.permission_key as page_path, rp.can_view, rp.can_create, rp.can_edit, rp.can_delete
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      WHERE ur.user_id = ? AND ur.company_id = ? AND ur.branch_id = ?
    `).all(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

    const mergedMap = new Map<string, { page_path: string; can_view: number; can_create: number; can_edit: number; can_delete: number }>()
    for (const perm of rolePermissions as any[]) {
      mergedMap.set(perm.page_path, {
        page_path: perm.page_path,
        can_view: perm.can_view ?? 0,
        can_create: perm.can_create ?? 0,
        can_edit: perm.can_edit ?? 0,
        can_delete: perm.can_delete ?? 0,
      })
    }
    for (const perm of permissions as any[]) {
      const existing = mergedMap.get(perm.page_path)
      if (existing) {
        existing.can_view = Math.max(existing.can_view, perm.can_view ?? 0)
        existing.can_create = Math.max(existing.can_create, perm.can_create ?? 0)
        existing.can_edit = Math.max(existing.can_edit, perm.can_edit ?? 0)
        existing.can_delete = Math.max(existing.can_delete, perm.can_delete ?? 0)
      } else {
        mergedMap.set(perm.page_path, {
          page_path: perm.page_path,
          can_view: perm.can_view ?? 0,
          can_create: perm.can_create ?? 0,
          can_edit: perm.can_edit ?? 0,
          can_delete: perm.can_delete ?? 0,
        })
      }
    }

    return NextResponse.json({
      user: {
        ...user,
        permissions: Array.from(mergedMap.values()),
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


