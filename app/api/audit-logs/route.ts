import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { getDatabase, DEFAULT_COMPANY_ID } from '@/lib/database/db'

export const GET = withAuth(async (request) => {
    try {
        const db = getDatabase()
        const url = new URL(request.url)

        // Filtreler
        const tableName = url.searchParams.get('table') || ''
        const action = url.searchParams.get('action') || ''
        const userId = url.searchParams.get('user_id') || ''
        const startDate = url.searchParams.get('start') || ''
        const endDate = url.searchParams.get('end') || ''
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
        const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '50'))
        const offset = (page - 1) * limit

        let where = 'WHERE a.company_id = ?'
        const params: any[] = [DEFAULT_COMPANY_ID]

        if (tableName) {
            where += ' AND a.table_name = ?'
            params.push(tableName)
        }
        if (action) {
            where += ' AND a.action = ?'
            params.push(action)
        }
        if (userId) {
            where += ' AND a.user_id = ?'
            params.push(userId)
        }
        if (startDate) {
            where += ' AND a.created_at >= ?'
            params.push(startDate)
        }
        if (endDate) {
            where += " AND a.created_at <= ? || ' 23:59:59'"
            params.push(endDate)
        }

        // Toplam kayıt
        const countRow = db.prepare(`SELECT COUNT(*) as count FROM audit_logs a ${where}`).get(...params) as any
        const total = countRow?.count || 0

        // Loglar
        const logs = db.prepare(`
      SELECT a.id, a.table_name, a.action, a.record_id,
             a.user_id, u.full_name as user_name, u.username,
             a.before_data, a.after_data, a.ip_address,
             a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ${where}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[]

        // Distinct tablo isimleri (filtre dropdown için)
        const tables = db.prepare(
            'SELECT DISTINCT table_name FROM audit_logs WHERE company_id = ? ORDER BY table_name'
        ).all(DEFAULT_COMPANY_ID) as any[]

        // Distinct kullanıcılar (filtre dropdown için)
        const users = db.prepare(`
      SELECT DISTINCT a.user_id, u.full_name, u.username
      FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.company_id = ? AND a.user_id IS NOT NULL
      ORDER BY u.full_name
    `).all(DEFAULT_COMPANY_ID) as any[]

        return ok({
            logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            filters: {
                tables: tables.map((t: any) => t.table_name),
                users: users.map((u: any) => ({ id: u.user_id, name: u.full_name || u.username })),
            },
        })
    } catch (error: any) {
        return fail(error.message, { status: 500 })
    }
})
