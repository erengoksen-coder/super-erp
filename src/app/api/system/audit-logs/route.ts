import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'

export const GET = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId, role } = authUser
    
    // Only admins can see audit logs
    if (role !== 'admin') {
      throw new Error('Bu raporu görüntülemek için yetkiniz yok.')
    }

    const { searchParams } = new URL(request.url)
    const entityName = searchParams.get('entity')
    const actionType = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '100')

    const db = getDatabase()
    
    let query = `
      SELECT 
        l.*,
        u.full_name as user_name,
        u.username
      FROM audit_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.company_id = ? AND l.branch_id = ?
    `
    const params: any[] = [companyId, branchId]

    if (entityName) {
      query += ' AND l.entity_name = ?'
      params.push(entityName)
    }

    if (actionType) {
      query += ' AND l.action_type = ?'
      params.push(actionType)
    }

    query += ' ORDER BY l.created_at DESC LIMIT ?'
    params.push(limit)

    const logs = db.prepare(query).all(...params)

    return ok(logs)
  })
})
