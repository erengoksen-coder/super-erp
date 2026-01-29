import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'
import { logAudit } from '@/lib/audit'
import { getAuthUserId } from '@/lib/auth/session'

async function getActorId(request: NextRequest) {
  return await getAuthUserId(request)
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const db = getDatabase()

    const workOrder = db.prepare(`
      SELECT 
        wo.*,
        po.order_number as production_order_number,
        po.status as production_order_status,
        p.name as product_name,
        p.sku as product_sku
      FROM work_orders wo
      JOIN production_orders po ON wo.production_order_id = po.id
      LEFT JOIN products p ON po.product_id = p.id
      WHERE wo.id = ? AND wo.company_id = ? AND wo.branch_id = ? AND wo.deleted_at IS NULL
    `).get(id, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as any

    if (!workOrder) {
      return NextResponse.json({ error: 'İş emri bulunamadı' }, { status: 404 })
    }

    const operations = db.prepare(`
      SELECT *
      FROM work_order_operations
      WHERE work_order_id = ?
      ORDER BY sequence ASC, created_at ASC
    `).all(id)

    return NextResponse.json({
      ...workOrder,
      operations,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const body = await request.json()
    const { status, planned_start_date, planned_end_date, notes } = body || {}

    const db = getDatabase()
    const existing = db.prepare(`
      SELECT * FROM work_orders
      WHERE id = ? AND company_id = ? AND branch_id = ? AND deleted_at IS NULL
    `).get(id, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as any

    if (!existing) {
      return NextResponse.json({ error: 'İş emri bulunamadı' }, { status: 404 })
    }

    db.prepare(`
      UPDATE work_orders
      SET status = COALESCE(?, status),
          planned_start_date = COALESCE(?, planned_start_date),
          planned_end_date = COALESCE(?, planned_end_date),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status || null, planned_start_date || null, planned_end_date || null, notes || null, id)

    const actorId = await getActorId(request)
    logAudit(db, {
      tableName: 'work_orders',
      action: 'update',
      recordId: id,
      userId: actorId,
      companyId: DEFAULT_COMPANY_ID,
      branchId: DEFAULT_BRANCH_ID,
      beforeData: existing,
      afterData: {
        status,
        planned_start_date,
        planned_end_date,
        notes,
      },
    })

    const updated = db.prepare('SELECT * FROM work_orders WHERE id = ?').get(id)
    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
