import type Database from 'better-sqlite3'
import { isAdminRole } from '@/lib/auth/permissions-check'

export type ExportLimits = {
  canExport: boolean
  maxExportRows: number | null
}

/**
 * Kullanıcının dışa aktarma sınırlarını döner.
 * Admin/yönetici sınırsız; diğerleri users.can_export ve users.max_export_rows ile kısıtlı.
 */
export function getExportLimits(
  db: Database.Database,
  userId: string,
  role?: string
): ExportLimits {
  if (isAdminRole(role)) {
    return { canExport: true, maxExportRows: null }
  }
  const row = db.prepare(`
    SELECT COALESCE(can_export, 1) as can_export, max_export_rows
    FROM users
    WHERE id = ? AND deleted_at IS NULL
  `).get(userId) as { can_export: number; max_export_rows: number | null } | undefined
  if (!row) {
    return { canExport: false, maxExportRows: null }
  }
  return {
    canExport: row.can_export === 1,
    maxExportRows: row.max_export_rows != null ? Math.max(0, row.max_export_rows) : null,
  }
}

/**
 * İstekteki limit parametresini kullanıcı max_export_rows ile sınırlar.
 * Admin için maxLimit değişmez.
 */
export function applyExportRowLimit(
  requestedLimit: number,
  limits: ExportLimits,
  systemMax: number
): number {
  let cap = Math.min(requestedLimit, systemMax)
  if (limits.maxExportRows != null && limits.maxExportRows > 0) {
    cap = Math.min(cap, limits.maxExportRows)
  }
  return cap
}
