import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { logger } from '@/lib/utils/logger'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT'

export interface AuditLogOptions {
  userId?: string
  companyId: string
  branchId: string
  actionType: AuditAction
  entityName?: string
  entityId?: string
  oldData?: any
  newData?: any
  description?: string
  ipAddress?: string
  userAgent?: string
}

export class AuditService {
  /**
   * Log an action to the audit_logs table.
   */
  static async log(options: AuditLogOptions) {
    try {
      const db = getDatabase()
      const id = randomUUID()
      
      const {
        userId,
        companyId,
        branchId,
        actionType,
        entityName,
        entityId,
        oldData,
        newData,
        description,
        ipAddress,
        userAgent
      } = options

      db.prepare(`
        INSERT INTO audit_logs (
          id, user_id, company_id, branch_id, action_type, 
          entity_name, entity_id, old_data, new_data, 
          description, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        userId || null,
        companyId,
        branchId,
        actionType,
        entityName || null,
        entityId || null,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        description || null,
        ipAddress || null,
        userAgent || null
      )

      // Also copy to file system logger for redundancy
      await logger.info(`Audit Log: ${actionType} on ${entityName || 'system'}`, {
        user: userId,
        entityId
      })

    } catch (error: any) {
      console.error('[AuditService] Failed to log action:', error.message)
      // Fallback to file logger if DB fails
      try {
        await logger.error('[AuditService] DB Logging failed', { error: error.message, options })
      } catch {}
    }
  }

  /**
   * Compare two objects and return only changed fields for optimized logging.
   * Useful for 'UPDATE' actions.
   */
  static calculateDiff(oldObj: any, newObj: any) {
    if (!oldObj || !newObj) return { old: oldObj, new: newObj }

    const diff: { old: any; new: any } = { old: {}, new: {} }
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])

    keys.forEach(key => {
      // Skip system fields
      if (['updated_at', 'created_at'].includes(key)) return

      if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        diff.old[key] = oldObj[key]
        diff.new[key] = newObj[key]
      }
    })

    return Object.keys(diff.new).length > 0 ? diff : null
  }
}
