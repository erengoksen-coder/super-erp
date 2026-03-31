import { NextRequest } from 'next/server'
import { ok } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'

export const GET = withAuth(async (request: NextRequest) => {
  return handleApi(async () => {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') ?? ''
    const to = searchParams.get('to') ?? ''

    const db = getDatabase()

    const tableInfo = db.prepare("PRAGMA table_info(production_orders)").all() as Array<{ name: string }>
    const hasCompletedAt = tableInfo.some((c) => c.name === 'completed_at')
    const completedCol = hasCompletedAt ? 'po.completed_at' : 'po.sevkiyat_completed_at'

    let whereClause = "WHERE (po.deleted_at IS NULL OR po.deleted_at = '')"
    const params: (string | number)[] = []

    if (from) {
      whereClause += ` AND (${completedCol} >= ? OR po.created_at >= ?)`
      params.push(from, from)
    }
    if (to) {
      const toEnd = to + 'T23:59:59.999Z'
      whereClause += ` AND (${completedCol} <= ? OR po.created_at <= ?)`
      params.push(toEnd, toEnd)
    }

    const byStatus = db.prepare(`
      SELECT po.status, COUNT(*) AS cnt, COALESCE(SUM(po.quantity), 0) AS total_qty
      FROM production_orders po
      ${whereClause}
      GROUP BY po.status
    `).all(...params) as Array<{ status: string; cnt: number; total_qty: number }>

    const completedInPeriod = db.prepare(`
      SELECT COUNT(*) AS cnt, COALESCE(SUM(po.quantity), 0) AS total_qty
      FROM production_orders po
      ${whereClause}
      AND (${completedCol} IS NOT NULL AND ${completedCol} != '')
    `).get(...params) as { cnt: number; total_qty: number }

    const allStatuses = db.prepare(`
      SELECT status, COUNT(*) AS cnt FROM production_orders
      WHERE (deleted_at IS NULL OR deleted_at = '')
      GROUP BY status
    `).all() as Array<{ status: string; cnt: number }>

    return ok({
      from: from || null,
      to: to || null,
      summary: {
        byStatus: Object.fromEntries(byStatus.map((r) => [r.status, { count: r.cnt, totalQuantity: r.total_qty }])),
        completedInPeriod: {
          count: completedInPeriod?.cnt ?? 0,
          totalQuantity: completedInPeriod?.total_qty ?? 0,
        },
        overall: Object.fromEntries(allStatuses.map((r) => [r.status, r.cnt])),
      },
    })
  }, { status: 500 })
})
