import { NextRequest } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { verifyToken } from '@/lib/auth/jwt'

// GET: Audit Logs with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    // 1. Authorization Check (Admin only)
    const token = request.cookies.get('auth-token')?.value
    if (!token) return fail('Yetkisiz erişim', { status: 401 })
    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') return fail('Admin yetkisi gerekli', { status: 403 })

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit
    const actionType = searchParams.get('actionType')
    const userId = searchParams.get('userId')
    const search = searchParams.get('search')

    const db = getDatabase()
    
    let query = `SELECT a.*, u.username, u.full_name FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id WHERE 1=1`
    const params: any[] = []

    if (actionType) {
      query += ` AND a.action_type = ?`
      params.push(actionType)
    }
    if (userId) {
      query += ` AND a.user_id = ?`
      params.push(userId)
    }
    if (search) {
      query += ` AND (a.description LIKE ? OR a.entity_name LIKE ? OR a.entity_id LIKE ?)`
      const searchParam = `%${search}%`
      params.push(searchParam, searchParam, searchParam)
    }

    query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const logs = db.prepare(query).all(...params)
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number }

    return ok({
      logs,
      pagination: {
        total: totalCount.count,
        page,
        limit,
        totalPages: Math.ceil(totalCount.count / limit)
      }
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return fail(message, { status: 500 })
  }
}
