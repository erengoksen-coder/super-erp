import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { hashPassword } from '@/lib/auth/password'
import { randomUUID } from 'crypto'
import { logAudit } from '@/lib/audit'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'

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

// GET: Tek kullanıcı detayı
export const GET = withAuth(async (
  request: NextRequest,
  authUser: { userId: string; role: string; companyId: string; branchId: string },
  context?: any
) => {
  return handleApi(async () => {
    const resolvedParams = await Promise.resolve(context?.params)
    if (!resolvedParams?.id) {
      return fail('ID gerekli', { status: 400 })
    }
    const userId = resolvedParams.id
    const db = getDatabase()
    const { companyId, branchId } = authUser

    const userData = db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.role,
        u.position,
        u.job_title,
        u.is_approved,
        COALESCE(u.is_locked, 0) as is_locked,
        u.approved_by,
        u.approved_at,
        u.created_at,
        u.last_login,
        a.full_name as approved_by_name
      FROM users u
      LEFT JOIN users a ON u.approved_by = a.id
      WHERE u.id = ? AND (u.company_id = ? OR u.company_id = ?)
        AND u.deleted_at IS NULL
    `).get(userId, companyId, DEFAULT_COMPANY_ID) as any

    if (!userData) {
      return fail('Kullanıcı bulunamadı', { status: 404 })
    }

    // İzinleri getir
    const permissions = db.prepare(`
      SELECT id, page_path, can_view, can_create, can_edit, can_delete
      FROM user_permissions
      WHERE user_id = ? AND (company_id = ? OR company_id = ?)
    `).all(userId, companyId, DEFAULT_COMPANY_ID)

    return ok({
      ...userData,
      permissions,
    })
  })
}, ['admin'])

// PATCH: Kullanıcı güncelle
export const PATCH = withAuth(async (
  request: NextRequest,
  authUser: { userId: string; role: string; companyId: string; branchId: string },
  context?: any
) => {
  return handleApi(async () => {
    const resolvedParams = await Promise.resolve(context?.params)
    if (!resolvedParams?.id) {
      return fail('ID gerekli', { status: 400 })
    }
    const userId = resolvedParams.id
    const { companyId, branchId } = authUser
    const body = await parseJsonBody(request)
    const { is_approved, approved_by, permissions, password, full_name, job_title, role, position, email, is_locked, dealer_name } = body

    if (password != null && String(password).trim() !== '') {
      if (authUser.role !== 'admin') {
        return fail('Kullanıcı şifresi sadece admin rolü tarafından değiştirilebilir.', { status: 403 })
      }
    }

    const db = getDatabase()

    // Kullanıcıyı bul
    const userData = db.prepare('SELECT * FROM users WHERE id = ? AND (company_id = ? OR company_id = ?) AND deleted_at IS NULL')
      .get(userId, companyId, DEFAULT_COMPANY_ID) as any
    if (!userData) {
      return fail('Kullanıcı bulunamadı', { status: 404 })
    }

    db.transaction(() => {
      // Kullanıcı bilgilerini güncelle
      if (is_approved !== undefined || approved_by || full_name !== undefined || job_title !== undefined || role !== undefined || position !== undefined || email !== undefined || is_locked !== undefined || dealer_name !== undefined) {
        let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP'
        const updateParams: any[] = []

        if (is_locked !== undefined) {
          updateQuery += ', is_locked = ?'
          updateParams.push(is_locked ? 1 : 0)
        }
        
        // YENİ: Eğer kullanıcı varsayılan şirketteyse, güncellendiğinde adminin şirketine taşı
        if (userData.company_id === DEFAULT_COMPANY_ID) {
          updateQuery += ', company_id = ?, branch_id = ?'
          updateParams.push(companyId, branchId)
        }

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

        if (dealer_name !== undefined) {
          updateQuery += ', dealer_name = ?'
          updateParams.push((dealer_name != null && String(dealer_name).trim() !== '') ? String(dealer_name).trim() : null)
        }

        if (password) {
          const passwordHash = hashPassword(password)
          updateQuery += ', password_hash = ?'
          updateParams.push(passwordHash)
        }

        updateQuery += ' WHERE id = ? AND (company_id = ? OR company_id = ?)'
        updateParams.push(userId, companyId, DEFAULT_COMPANY_ID)

        db.prepare(updateQuery).run(...updateParams)
      }

      // İzinleri güncelle
      if (permissions && Array.isArray(permissions)) {
        db.prepare('DELETE FROM user_permissions WHERE user_id = ? AND (company_id = ? OR company_id = ?)').run(userId, companyId, DEFAULT_COMPANY_ID)

        for (const perm of permissions) {
          if (perm.page_path) {
            db.prepare(`
              INSERT INTO user_permissions (id, user_id, page_path, can_view, can_create, can_edit, can_delete, company_id, branch_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              randomUUID(),
              userId,
              perm.page_path,
              perm.can_view ? 1 : 0,
              perm.can_create ? 1 : 0,
              perm.can_edit ? 1 : 0,
              perm.can_delete ? 1 : 0,
              companyId,
              branchId
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
        `).run(roleId, roleName, null, companyId, branchId)

        db.prepare('DELETE FROM user_roles WHERE user_id = ? AND (company_id = ? OR company_id = ?)').run(userId, companyId, DEFAULT_COMPANY_ID)
        db.prepare(`
          INSERT OR IGNORE INTO user_roles (id, user_id, role_id, company_id, branch_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(`ur_${userId}_${roleId}`, userId, roleId, companyId, branchId)
      }
    })()

    const updatedUser = db.prepare(`
      SELECT id, username, role, email, is_approved
      FROM users
      WHERE id = ? AND (company_id = ? OR company_id = ?)
        AND deleted_at IS NULL
    `).get(userId, companyId, DEFAULT_COMPANY_ID) as any

    logAudit(db, {
      tableName: 'users',
      action: 'update',
      recordId: userId,
      userId: authUser.userId,
      companyId: companyId,
      branchId: branchId,
      before: {
        role: userData.role,
        email: userData.email,
        is_approved: userData.is_approved,
      },
      after: {
        role: updatedUser?.role,
        email: updatedUser?.email,
        is_approved: updatedUser?.is_approved,
      },
    })

    return ok(null, { message: 'Kullanıcı başarıyla güncellendi' })
  })
}, ['admin'])

// DELETE: Kullanıcı sil
export const DELETE = withAuth(async (
  request: NextRequest,
  authUser: { userId: string; role: string; companyId: string; branchId: string },
  context?: any
) => {
  return handleApi(async () => {
    const resolvedParams = await Promise.resolve(context?.params)
    if (!resolvedParams?.id) {
      return fail('ID gerekli', { status: 400 })
    }
    const userId = resolvedParams.id
    const { companyId, branchId } = authUser
    const db = getDatabase()

    const userData = db.prepare('SELECT role, username, email, is_approved FROM users WHERE id = ? AND (company_id = ? OR company_id = ?) AND deleted_at IS NULL')
      .get(userId, companyId, DEFAULT_COMPANY_ID) as any
    if (userData && userData.role === 'admin') {
      return fail('Admin kullanıcı silinemez', { status: 400 })
    }

    db.prepare('UPDATE users SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (company_id = ? OR company_id = ?)')
      .run(userId, companyId, DEFAULT_COMPANY_ID)

    logAudit(db, {
      tableName: 'users',
      action: 'delete',
      recordId: userId,
      userId: authUser.userId,
      companyId: companyId,
      branchId: branchId,
      before: {
        username: userData?.username,
        role: userData?.role,
        email: userData?.email,
        is_approved: userData?.is_approved,
      },
    })

    return ok(null, { message: 'Kullanıcı başarıyla silindi' })
  })
}, ['admin'])
