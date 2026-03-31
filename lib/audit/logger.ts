import { randomUUID } from 'crypto'
import { getDatabase } from '@/lib/database/db'

type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'

type AuditProps = {
  table: string
  recordId: string
  action: AuditAction
  oldData?: unknown
  newData?: unknown
  userId: string
  ipAddress?: string
}

let cachedColumns: Set<string> | null = null

function getAuditColumns() {
  if (cachedColumns) {
    return cachedColumns
  }
  const db = getDatabase()
  const columns = db.prepare('PRAGMA table_info(audit_logs)').all() as { name: string }[]
  cachedColumns = new Set(columns.map((col) => col.name))
  return cachedColumns
}

export function logAudit(props: AuditProps) {
  try {
    const db = getDatabase()
    const columns = getAuditColumns()
    const id = randomUUID()
    const oldPayload = props.oldData ? JSON.stringify(props.oldData) : null
    const newPayload = props.newData ? JSON.stringify(props.newData) : null
    const ipValue = props.ipAddress || null

    if (columns.has('old_data') && columns.has('new_data')) {
      if (columns.has('ip_address')) {
        db.prepare(`
          INSERT INTO audit_logs
          (id, table_name, record_id, action, old_data, new_data, user_id, ip_address)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          props.table,
          props.recordId,
          props.action,
          oldPayload,
          newPayload,
          props.userId,
          ipValue
        )
        return
      }

      db.prepare(`
        INSERT INTO audit_logs
        (id, table_name, record_id, action, old_data, new_data, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        props.table,
        props.recordId,
        props.action,
        oldPayload,
        newPayload,
        props.userId
      )
      return
    }

    // Fallback to legacy column names
    db.prepare(`
      INSERT INTO audit_logs
      (id, table_name, record_id, action, before_data, after_data, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      props.table,
      props.recordId,
      props.action,
      oldPayload,
      newPayload,
      props.userId
    )
  } catch (error) {
    console.error('Audit log hatası:', error)
  }
}
