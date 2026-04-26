/**
 * Kullanıcı repository – Faz 2.2
 * Kullanıcı listeleme, getir, kullanıcı adı kontrolü, izinler.
 */

import { randomUUID } from 'crypto'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'

export type UserRow = Record<string, unknown> & {
  id: string
  last_activity?: string | null
  last_login?: string | null
}

export type PermissionRow = {
  page_path: string
  can_view: number
  can_create: number
  can_edit: number
  can_delete: number
}

export type UserCreatePayload = {
  id: string
  username: string
  email: string | null
  password_hash: string
  full_name: string | null
  role: string
  position: string | null
  job_title: string | null
  is_approved: number
  dealer_name: string | null
  can_export: number
  max_export_rows: number | null
  view_only: number
}

export type UserPermissionInsert = {
  page_path: string
  can_view: number
  can_create: number
  can_edit: number
  can_delete: number
}

function normalizeRole(role: string | undefined): string {
  if (!role) return 'user'
  const raw = String(role).trim().toLowerCase()
  if (raw === 'admin' || raw === 'yönetici' || raw === 'yonetici') return 'admin'
  return raw
}

export const userRepository = {
  /** Tüm kullanıcılar (company_id, branch_id ile) */
  getList(): UserRow[] {
    const db = getDatabase()
    return db.prepare(`
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
        u.last_activity,
        u.dealer_name,
        COALESCE(u.can_export, 1) as can_export,
        u.max_export_rows,
        COALESCE(u.view_only, 0) as view_only,
        a.full_name as approved_by_name
      FROM users u
      LEFT JOIN users a ON u.approved_by = a.id
      WHERE u.company_id = ? AND u.branch_id = ?
        AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `).all(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as UserRow[]
  },

  /** Tek kullanıcı */
  getById(id: string): UserRow | undefined {
    const db = getDatabase()
    return db.prepare(`
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
        COALESCE(u.can_export, 1) as can_export,
        u.max_export_rows,
        COALESCE(u.view_only, 0) as view_only,
        a.full_name as approved_by_name
      FROM users u
      LEFT JOIN users a ON u.approved_by = a.id
      WHERE u.id = ? AND u.company_id = ? AND u.branch_id = ?
        AND u.deleted_at IS NULL
    `).get(id, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as UserRow | undefined
  },

  /** Kullanıcı adına göre id (çakışma kontrolü) */
  getByUsername(username: string): { id: string } | undefined {
    const db = getDatabase()
    return db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: string } | undefined
  },

  /** Kullanıcının sayfa izinleri */
  getPermissions(userId: string): PermissionRow[] {
    const db = getDatabase()
    return db.prepare(`
      SELECT page_path, can_view, can_create, can_edit, can_delete
      FROM user_permissions
      WHERE user_id = ? AND company_id = ? AND branch_id = ?
    `).all(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as PermissionRow[]
  },

  /** Yeni kullanıcı + rol + user_roles + user_permissions (transaction) */
  create(
    user: UserCreatePayload,
    roleId: string,
    permissions: UserPermissionInsert[]
  ): void {
    const db = getDatabase()
    db.transaction(() => {
      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, full_name, role, position, job_title, is_approved, company_id, branch_id, dealer_name, can_export, max_export_rows, view_only)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.id,
        user.username,
        user.email,
        user.password_hash,
        user.full_name,
        user.role,
        user.position,
        user.job_title,
        user.is_approved,
        DEFAULT_COMPANY_ID,
        DEFAULT_BRANCH_ID,
        user.dealer_name,
        user.can_export,
        user.max_export_rows,
        user.view_only
      )

      db.prepare(`
        INSERT OR IGNORE INTO roles (id, name, description, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(roleId, user.role, null, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

      db.prepare(`
        INSERT OR IGNORE INTO user_roles (id, user_id, role_id, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(`ur_${user.id}_${roleId}`, user.id, roleId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

      for (const perm of permissions) {
        const permId = randomUUID()
        db.prepare(`
          INSERT INTO user_permissions (id, user_id, page_path, can_view, can_create, can_edit, can_delete, company_id, branch_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          permId,
          user.id,
          perm.page_path,
          perm.can_view,
          perm.can_create,
          perm.can_edit,
          perm.can_delete,
          DEFAULT_COMPANY_ID,
          DEFAULT_BRANCH_ID
        )
      }
    })()
  },

  /** Kullanıcı güncelle (PATCH): dinamik alanlar + isteğe bağlı izinler/rol. Transaction içinde çalışır. */
  updateUser(
    userId: string,
    payload: {
      can_export?: boolean | number
      max_export_rows?: number | null
      view_only?: boolean | number
      is_locked?: boolean | number
      is_approved?: boolean | number
      approved_by?: string | null
      email?: string | null
      full_name?: string | null
      job_title?: string | null
      role?: string
      position?: string | null
      dealer_name?: string | null
      password_hash?: string
      permissions?: Array<{ page_path: string; can_view?: boolean; can_create?: boolean; can_edit?: boolean; can_delete?: boolean }>
    }
  ): void {
    const db = getDatabase()
    const {
      can_export,
      max_export_rows,
      view_only,
      is_locked,
      is_approved,
      approved_by,
      email,
      full_name,
      job_title,
      role,
      position,
      dealer_name,
      password_hash,
      permissions,
    } = payload

    db.transaction(() => {
      let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP'
      const updateParams: unknown[] = []

      if (can_export !== undefined) {
        updateQuery += ', can_export = ?'
        updateParams.push(can_export ? 1 : 0)
      }
      if (max_export_rows !== undefined) {
        updateQuery += ', max_export_rows = ?'
        updateParams.push(max_export_rows == null || max_export_rows === '' ? null : Math.max(0, parseInt(String(max_export_rows), 10) || 0))
      }
      if (view_only !== undefined) {
        updateQuery += ', view_only = ?'
        updateParams.push(view_only ? 1 : 0)
      }
      if (is_locked !== undefined) {
        updateQuery += ', is_locked = ?'
        updateParams.push(is_locked ? 1 : 0)
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
        updateQuery += ', role = ?'
        updateParams.push(normalizeRole(role))
      }
      if (position !== undefined) {
        updateQuery += ', position = ?'
        updateParams.push(position || null)
      }
      if (dealer_name !== undefined) {
        updateQuery += ', dealer_name = ?'
        updateParams.push((dealer_name != null && String(dealer_name).trim() !== '') ? String(dealer_name).trim() : null)
      }
      if (password_hash !== undefined) {
        updateQuery += ', password_hash = ?'
        updateParams.push(password_hash)
      }

      if (updateParams.length > 0) {
        updateQuery += ' WHERE id = ?'
        updateParams.push(userId)
        db.prepare(updateQuery).run(...updateParams)
      }

      if (permissions && Array.isArray(permissions)) {
        db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(userId)
        const viewOnly = view_only === true || view_only === 1
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
              viewOnly ? 0 : (perm.can_create ? 1 : 0),
              viewOnly ? 0 : (perm.can_edit ? 1 : 0),
              viewOnly ? 0 : (perm.can_delete ? 1 : 0),
              DEFAULT_COMPANY_ID,
              DEFAULT_BRANCH_ID
            )
          }
        }
        if (view_only === true || view_only === 1) {
          db.prepare('UPDATE user_permissions SET can_create = 0, can_edit = 0, can_delete = 0 WHERE user_id = ?').run(userId)
        }
      }

      if (role !== undefined) {
        const roleName = normalizeRole(role)
        const roleId = roleName === 'admin' ? 'role_admin' : roleName === 'user' ? 'role_user' : `role_${roleName.replace(/[^a-z0-9_]+/g, '_')}`
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
  },

  /** Soft delete (deleted_at) */
  delete(userId: string): number {
    const db = getDatabase()
    const result = db.prepare(
      'UPDATE users SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ? AND branch_id = ?'
    ).run(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)
    return result.changes
  },
}
