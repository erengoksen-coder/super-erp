import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { logAudit } from '@/lib/audit'
import { getAuthUserId } from '@/lib/auth/session'

const DEFAULT_STATIONS = ['iskelet', 'terzihane', 'doseme', 'montaj', 'sevkiyat']

async function getActorId(request: NextRequest) {
  return await getAuthUserId(request)
}

function generateWorkOrderNumber(db: ReturnType<typeof getDatabase>) {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const todayStr = `${year}${month}${day}`

  const todayCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM work_orders 
    WHERE work_order_number LIKE ?
  `).get(`WO-${todayStr}-%`) as { count?: number } | undefined

  let sequence = (todayCount?.count || 0) + 1
  let attempts = 0

  while (attempts < 100) {
    const number = `WO-${todayStr}-${String(sequence).padStart(4, '0')}`
    const existing = db
      .prepare('SELECT id FROM work_orders WHERE work_order_number = ? AND deleted_at IS NULL')
      .get(number) as { id?: string } | undefined
    if (!existing) {
      return number
    }
    sequence++
    attempts++
  }

  return `WO-${todayStr}-${randomUUID().slice(0, 4)}`
}

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = getDatabase()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const productionOrderId = searchParams.get('production_order_id')
    const search = searchParams.get('search') || searchParams.get('q')

    let query = `
      SELECT 
        wo.*,
        po.order_number as production_order_number,
        po.status as production_order_status,
        p.name as product_name,
        p.sku as product_sku
      FROM work_orders wo
      JOIN production_orders po ON wo.production_order_id = po.id
      LEFT JOIN active_products p ON po.product_id = p.id
      WHERE wo.company_id = ? AND wo.branch_id = ? AND wo.deleted_at IS NULL
    `
    const params: any[] = [DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID]

    if (status) {
      query += ' AND wo.status = ?'
      params.push(status)
    }
    if (productionOrderId) {
      query += ' AND wo.production_order_id = ?'
      params.push(productionOrderId)
    }
    if (search && search.trim()) {
      const term = `%${search.trim()}%`
      query += `
        AND (
          wo.work_order_number LIKE ?
          OR po.order_number LIKE ?
          OR p.name LIKE ?
          OR p.sku LIKE ?
        )
      `
      params.push(term, term, term, term)
    }

    query += ' ORDER BY wo.created_at DESC'

    const rows = db.prepare(query).all(...params)
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { production_order_id, planned_start_date, planned_end_date, notes, stations } = body || {}

    if (!production_order_id) {
      return NextResponse.json({ error: 'production_order_id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const productionOrder = db.prepare(`
      SELECT id FROM production_orders
      WHERE id = ? AND deleted_at IS NULL
    `).get(production_order_id) as { id?: string } | undefined

    if (!productionOrder) {
      return NextResponse.json({ error: 'Üretim emri bulunamadı' }, { status: 404 })
    }

    const existing = db.prepare(`
      SELECT id FROM work_orders 
      WHERE production_order_id = ? AND deleted_at IS NULL
    `).get(production_order_id) as { id?: string } | undefined

    if (existing) {
      return NextResponse.json({ error: 'Bu üretim emri için zaten iş emri var' }, { status: 409 })
    }

    const workOrderId = randomUUID()
    const workOrderNumber = generateWorkOrderNumber(db)
    const stationsToUse = Array.isArray(stations) && stations.length > 0
      ? stations
      : DEFAULT_STATIONS

    const actorId = await getActorId(request)
    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO work_orders
        (id, production_order_id, work_order_number, status, planned_start_date, planned_end_date, notes, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        workOrderId,
        production_order_id,
        workOrderNumber,
        'open',
        planned_start_date || null,
        planned_end_date || null,
        notes || null,
        DEFAULT_COMPANY_ID,
        DEFAULT_BRANCH_ID
      )

      const insertOperation = db.prepare(`
        INSERT INTO work_order_operations
        (id, work_order_id, station, status, sequence)
        VALUES (?, ?, ?, ?, ?)
      `)
      stationsToUse.forEach((station: string, index: number) => {
        insertOperation.run(randomUUID(), workOrderId, station, 'pending', index + 1)
      })
    })

    transaction()

    logAudit(db, {
      tableName: 'work_orders',
      action: 'create',
      recordId: workOrderId,
      userId: actorId,
      companyId: DEFAULT_COMPANY_ID,
      branchId: DEFAULT_BRANCH_ID,
      afterData: {
        id: workOrderId,
        production_order_id,
        work_order_number: workOrderNumber,
      },
    })

    return NextResponse.json({
      success: true,
      id: workOrderId,
      work_order_number: workOrderNumber,
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
