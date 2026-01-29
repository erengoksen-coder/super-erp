import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID } from '@/lib/database/db'

type AuditEntry = {
  tableName: string
  action: 'create' | 'update' | 'delete'
  recordId?: string | null
  userId?: string | null
  companyId?: string | null
  branchId?: string | null
  before?: unknown
  after?: unknown
}

export function logAudit(db: Database.Database, entry: AuditEntry) {
  try {
    const id = randomUUID()
    const companyId = entry.companyId || DEFAULT_COMPANY_ID
    const branchId = entry.branchId || DEFAULT_BRANCH_ID
    const beforeData = entry.before !== undefined ? JSON.stringify(entry.before) : null
    const afterData = entry.after !== undefined ? JSON.stringify(entry.after) : null

    db.prepare(`
      INSERT INTO audit_logs
      (id, table_name, action, record_id, user_id, company_id, branch_id, before_data, after_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entry.tableName,
      entry.action,
      entry.recordId || null,
      entry.userId || null,
      companyId,
      branchId,
      beforeData,
      afterData
    )
  } catch {
    // Audit logs should not break primary flows
  }
}
