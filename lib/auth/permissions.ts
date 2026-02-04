import type Database from 'better-sqlite3'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID } from '@/lib/database/db'
import type { Permission } from '@/lib/auth/permissions-check'

export function loadUserPermissions(db: Database.Database, userId: string) {
  const permissions = db.prepare(`
    SELECT page_path, can_view, can_create, can_edit, can_delete
    FROM user_permissions
    WHERE user_id = ? AND company_id = ? AND branch_id = ?
  `).all(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as Permission[]

  const rolePermissions = db.prepare(`
    SELECT rp.permission_key as page_path, rp.can_view, rp.can_create, rp.can_edit, rp.can_delete
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    WHERE ur.user_id = ? AND ur.company_id = ? AND ur.branch_id = ?
  `).all(userId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as Permission[]

  const mergedMap = new Map<string, Permission>()
  for (const perm of rolePermissions) {
    mergedMap.set(perm.page_path, {
      page_path: perm.page_path,
      can_view: perm.can_view ?? 0,
      can_create: perm.can_create ?? 0,
      can_edit: perm.can_edit ?? 0,
      can_delete: perm.can_delete ?? 0,
    })
  }
  for (const perm of permissions) {
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

  return Array.from(mergedMap.values())
}

export type { Permission }
