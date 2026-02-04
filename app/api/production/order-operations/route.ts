import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { randomUUID } from 'crypto'
import { getDatabase } from '@/lib/database/db'

type OrderOperationRow = {
  id: string
  production_order_id: string
  operation_id: string
  work_center_id: string | null
  personnel_id: string | null
  planned_start: string | null
  planned_end: string | null
  actual_start: string | null
  actual_end: string | null
  planned_duration_minutes: number
  actual_duration_minutes: number
  status: string
  delay_reason: string | null
  notes: string | null
  operation_name: string
  work_center_name: string | null
  personnel_name: string | null
  order_number: string | null
  product_name: string | null
}

function diffMinutes(start?: string | null, end?: string | null) {
  if (!start || !end) return 0
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) return 0
  return Math.max(Math.round((endDate.getTime() - startDate.getTime()) / 60000), 0)
}

// GET: Üretim operasyonlarını listele
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const productionOrderId = searchParams.get('production_order_id')
    const db = getDatabase()

    const rows = db.prepare(`
      SELECT 
        poo.*,
        o.name as operation_name,
        wc.name as work_center_name,
        p.full_name as personnel_name,
        po.order_number,
        pr.name as product_name
      FROM production_order_operations poo
      JOIN operations o ON poo.operation_id = o.id
      LEFT JOIN work_centers wc ON poo.work_center_id = wc.id
      LEFT JOIN hr_employees p ON poo.personnel_id = p.id
      LEFT JOIN production_orders po ON poo.production_order_id = po.id
      LEFT JOIN active_products pr ON po.product_id = pr.id
      WHERE (? IS NULL OR poo.production_order_id = ?)
      ORDER BY poo.created_at DESC
    `).all(productionOrderId, productionOrderId) as OrderOperationRow[]

    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Üretim operasyonu kaydı oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const {
      production_order_id,
      operation_id,
      work_center_id,
      personnel_id,
      planned_start,
      planned_end,
      actual_start,
      actual_end,
      planned_duration_minutes,
      actual_duration_minutes,
      status,
      delay_reason,
      notes,
    } = body || {}

    if (!production_order_id || !operation_id) {
      return NextResponse.json(
        { error: 'production_order_id ve operation_id gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    const exists = db.prepare(`
      SELECT id FROM production_order_operations
      WHERE production_order_id = ? AND operation_id = ?
    `).get(production_order_id, operation_id) as { id: string } | undefined
    if (exists) {
      return NextResponse.json({ error: 'Bu operasyon zaten atanmış' }, { status: 409 })
    }

    const plannedMinutes = Number(planned_duration_minutes) || 0
    const actualMinutes = Number(actual_duration_minutes) || diffMinutes(actual_start, actual_end)
    const id = randomUUID()

    db.prepare(`
      INSERT INTO production_order_operations
      (id, production_order_id, operation_id, work_center_id, personnel_id,
       planned_start, planned_end, actual_start, actual_end,
       planned_duration_minutes, actual_duration_minutes,
       status, delay_reason, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      production_order_id,
      operation_id,
      work_center_id || null,
      personnel_id || null,
      planned_start || null,
      planned_end || null,
      actual_start || null,
      actual_end || null,
      plannedMinutes,
      actualMinutes,
      status || 'planned',
      delay_reason || null,
      notes || null
    )

    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// PATCH: Üretim operasyonu güncelle
export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const {
      id,
      work_center_id,
      personnel_id,
      planned_start,
      planned_end,
      actual_start,
      actual_end,
      planned_duration_minutes,
      actual_duration_minutes,
      status,
      delay_reason,
      notes,
    } = body || {}

    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const existing = db.prepare('SELECT * FROM production_order_operations WHERE id = ?').get(id) as OrderOperationRow | undefined
    if (!existing) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
    }

    const plannedMinutes = planned_duration_minutes !== undefined
      ? Number(planned_duration_minutes) || 0
      : existing.planned_duration_minutes
    const actualMinutes = actual_duration_minutes !== undefined
      ? Number(actual_duration_minutes) || 0
      : diffMinutes(actual_start ?? existing.actual_start, actual_end ?? existing.actual_end)

    db.prepare(`
      UPDATE production_order_operations
      SET work_center_id = COALESCE(?, work_center_id),
          personnel_id = COALESCE(?, personnel_id),
          planned_start = COALESCE(?, planned_start),
          planned_end = COALESCE(?, planned_end),
          actual_start = COALESCE(?, actual_start),
          actual_end = COALESCE(?, actual_end),
          planned_duration_minutes = ?,
          actual_duration_minutes = ?,
          status = COALESCE(?, status),
          delay_reason = COALESCE(?, delay_reason),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      work_center_id !== undefined ? work_center_id || null : null,
      personnel_id !== undefined ? personnel_id || null : null,
      planned_start !== undefined ? planned_start || null : null,
      planned_end !== undefined ? planned_end || null : null,
      actual_start !== undefined ? actual_start || null : null,
      actual_end !== undefined ? actual_end || null : null,
      plannedMinutes,
      actualMinutes,
      status !== undefined ? status || null : null,
      delay_reason !== undefined ? delay_reason || null : null,
      notes !== undefined ? notes || null : null,
      id
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// DELETE: Üretim operasyonu sil
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    db.prepare('DELETE FROM production_order_operations WHERE id = ?').run(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
