import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'
import { logAudit } from '@/lib/audit'
import { getAuthUserId } from '@/lib/auth/session'

async function getActorId(request: NextRequest) {
  return await getAuthUserId(request)
}

export const PATCH = withAuth(async (request: NextRequest, user, context?: { params?: { id?: string } | Promise<{ id?: string }> }) => {
  try {
    const resolvedParams = await Promise.resolve(context?.params)
    const id =
      resolvedParams?.id ??
      new URL(request.url).pathname.split('/').filter(Boolean).slice(-2)[0]
    const body = await request.json()
    const { station, status, notes } = body || {}

    if (!station) {
      return NextResponse.json({ error: 'station gerekli' }, { status: 400 })
    }
    if (!status) {
      return NextResponse.json({ error: 'status gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const operation = db.prepare(`
      SELECT o.*
      FROM work_order_operations o
      JOIN work_orders w ON o.work_order_id = w.id
      WHERE o.work_order_id = ? AND o.station = ? AND w.company_id = ? AND w.branch_id = ? AND w.deleted_at IS NULL
    `).get(id, station, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as any

    if (!operation) {
      return NextResponse.json({ error: 'Operasyon bulunamadı' }, { status: 404 })
    }

    const startedAt = status === 'in_progress' ? new Date().toISOString() : null
    const completedAt = status === 'completed' ? new Date().toISOString() : null

    db.prepare(`
      UPDATE work_order_operations
      SET status = ?,
          started_at = COALESCE(?, started_at),
          completed_at = COALESCE(?, completed_at),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, startedAt, completedAt, notes || null, operation.id)

    const actorId = await getActorId(request)
    logAudit(db, {
      tableName: 'work_order_operations',
      action: 'update',
      recordId: operation.id,
      userId: actorId,
      companyId: DEFAULT_COMPANY_ID,
      branchId: DEFAULT_BRANCH_ID,
      beforeData: operation,
      afterData: {
        status,
        started_at: startedAt,
        completed_at: completedAt,
        notes,
      },
    })

    const updated = db.prepare('SELECT * FROM work_order_operations WHERE id = ?').get(operation.id)
    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
