import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'
import { createHash } from 'crypto'
import { randomUUID } from 'crypto'
import { logAudit } from '@/lib/audit'
import { getAuthUserId } from '@/lib/auth/session'

function normalizeRoleName(role: unknown): string {
  const raw = String(role || '').trim().toLowerCase()
  if (raw === 'admin' || raw === 'yönetici' || raw === 'yonetici') return 'admin'
  if (!raw) return 'user'
  return raw
}

function getRoleId(roleName: string): string {
  if (roleName === 'admin') return 'role_admin'
  if (roleName === 'user') return 'role_user'
  return `role_${roleName.replace(/[^a-z0-9_]+/g, '_')}`
}

async function getActorId(request: NextRequest) {
  return await getAuthUserId(request)
}

// GET: Tek kullanıcı detayı
export const GET = withAuth(async (
  request: NextRequest, user,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) => {
  try {
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id
    const db = getDatabase()

    const user = db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.role,
        u.position,
        u.job_title,
        u.is_approved,
        u.approved_by,
        u.approved_at,
        u.created_at,
        u.last_login,
        a.full_name as approved_by_name
      FROM users u
      LEFT JOIN users a ON u.approved_by = a.id
      WHERE u.id = ? AND u.company_id = ? AND u.branch_id = ?
        AND u.deleted_at IS NULL
    `).get(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as any

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // İzinleri getir
    const permissions = db.prepare(`
      SELECT id, page_path, can_view, can_create, can_edit, can_delete
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
})

// PATCH: Kullanıcı güncelle (onaylama, izin güncelleme)
export const PATCH = withAuth(async (
  request: NextRequest, user,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) => {
  try {
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id
    const body = await request.json()
    const { is_approved, approved_by, permissions, password, full_name, job_title, role, position, email } = body

    const db = getDatabase()

    // Kullanıcıyı bul
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND company_id = ? AND branch_id = ? AND deleted_at IS NULL')
      .get(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as any
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    db.transaction(() => {
      // Kullanıcı bilgilerini güncelle
      if (is_approved !== undefined || approved_by || full_name !== undefined || job_title !== undefined || role !== undefined || position !== undefined || email !== undefined) {
        let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP'
        const updateParams: any[] = []

        if (is_approved !== undefined) {
          updateQuery += ', is_approved = ?'
          updateParams.push(is_approved ? 1 : 0)
          if (is_approved && approved_by) {
            updateQuery += ', approved_by = ?, approved_at = CURRENT_TIMESTAMP'
            updateParams.push(approved_by)
          }
        }

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

        if (role !== undefined) {
          const roleName = normalizeRoleName(role)
          updateQuery += ', role = ?'
          updateParams.push(roleName)
        }

        if (position !== undefined) {
          updateQuery += ', position = ?'
          updateParams.push(position || null)
        }

        if (password) {
          const passwordHash = createHash('sha256').update(password).digest('hex')
          updateQuery += ', password_hash = ?'
          updateParams.push(passwordHash)
        }

        updateQuery += ' WHERE id = ?'
        updateParams.push(userId)

        db.prepare(updateQuery).run(...updateParams)
      }

      // İzinleri güncelle
      if (permissions && Array.isArray(permissions)) {
        // Mevcut izinleri sil
        db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(userId)

        // Yeni izinleri ekle
        for (const perm of permissions) {
          if (perm.page_path) {
            const permId = randomUUID()
            db.prepare(`
              INSERT INTO user_permissions (id, user_id, page_path, can_view, can_create, can_edit, can_delete, company_id, branch_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              permId,
              userId,
              perm.page_path,
              perm.can_view ? 1 : 0,
              perm.can_create ? 1 : 0,
              perm.can_edit ? 1 : 0,
              perm.can_delete ? 1 : 0,
              DEFAULT_COMPANY_ID,
              DEFAULT_BRANCH_ID
            )
          }
        }
      }

      if (role !== undefined) {
        const roleName = normalizeRoleName(role)
        const roleId = getRoleId(roleName)

        db.prepare(`
          INSERT OR IGNORE INTO roles (id, name, description, company_id, branch_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(roleId, roleName, null, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

        db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId)
        db.prepare(`
          INSERT OR IGNORE INTO user_roles (id, user_id, role_id, company_id, branch_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(`ur_${userId}_${roleId}`, userId, roleId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)
      }
    })()

    const updatedUser = db.prepare(`
      SELECT id, username, role, email, is_approved
      FROM users
      WHERE id = ? AND company_id = ? AND branch_id = ?
        AND deleted_at IS NULL
    `).get(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as any

    logAudit(db, {
      tableName: 'users',
      action: 'update',
      recordId: userId,
      userId: await getActorId(request),
      before: {
        role: user.role,
        email: user.email,
        is_approved: user.is_approved,
      },
      after: {
        role: updatedUser?.role,
        email: updatedUser?.email,
        is_approved: updatedUser?.is_approved,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// DELETE: Kullanıcı sil
export const DELETE = withAuth(async (
  request: NextRequest, user,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) => {
  try {
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id
    const db = getDatabase()

    // Admin kullanıcıyı silme
    const user = db.prepare('SELECT role, username, email, is_approved FROM users WHERE id = ? AND company_id = ? AND branch_id = ? AND deleted_at IS NULL')
      .get(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as any
    if (user && user.role === 'admin') {
      return NextResponse.json(
        { error: 'Admin kullanıcı silinemez' },
        { status: 400 }
      )
    }

    db.prepare('UPDATE users SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ? AND branch_id = ?')
      .run(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

    logAudit(db, {
      tableName: 'users',
      action: 'delete',
      recordId: userId,
      userId: await getActorId(request),
      before: {
        username: user?.username,
        role: user?.role,
        email: user?.email,
        is_approved: user?.is_approved,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
