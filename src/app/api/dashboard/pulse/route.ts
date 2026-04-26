import { ok } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'

/**
 * Super ERP - Dashboard Pulse API
 * Transforms raw audit logs into human-readable real-time feed messages.
 */
export const GET = withAuth(async (request, user) => {
  return handleApi(async () => {
    const { companyId, branchId } = user
    const db = getDatabase()

    const logs = db.prepare(`
      SELECT 
        id, 
        action_type, 
        entity_name, 
        description, 
        created_at 
      FROM audit_logs 
      WHERE deleted_at IS NULL AND company_id = ? AND branch_id = ?
      ORDER BY created_at DESC 
      LIMIT 10
    `).all(companyId, branchId) as any[]

    const formattedEvents = logs.map(log => {
      const type = log.action_type === 'CREATE' ? 'success' : 
                   log.action_type === 'DELETE' ? 'warning' : 'info'
      
      let text = log.description
      if (!text || text === 'null') {
        const entityLabel = log.entity_name === 'orders' ? 'Sipariş' :
                            log.entity_name === 'shipments' ? 'Sevkiyat' :
                            log.entity_name === 'materials' ? 'Malzeme Stok' : 
                            log.entity_name === 'production_orders' ? 'Üretim Emri' : 
                            (log.entity_name && log.entity_name !== 'null' ? log.entity_name : 'Sistem Kaydı');
        
        const actionLabel = log.action_type === 'CREATE' ? 'oluşturuldu' : 
                            log.action_type === 'UPDATE' ? 'güncellendi' : 
                            log.action_type === 'DELETE' ? 'silindi' : 'işlem gördü';
        
        text = `${entityLabel} ${actionLabel}.`;
      }

      // Helper to transform into Agi-Friendly time labels (Xsn önce, Xdk önce)
      const now = new Date()
      const created = new Date(log.created_at)
      const diffMs = now.getTime() - created.getTime()
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)
      
      const timeLabel = diffSec < 60 ? `${diffSec}sn önce` : 
                        diffMin < 60 ? `${diffMin}dk önce` : 'Az önce'

      return {
        id: log.id,
        type,
        text,
        time: timeLabel
      }
    })

    return ok(formattedEvents)
  })
})
