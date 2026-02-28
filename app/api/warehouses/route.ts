import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase, DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID } from '@/lib/database/db'
import { randomUUID } from 'crypto'

type WarehouseInput = {
  code?: string
  name?: string
}

// GET: Depoları listele (stok bilgisiyle birlikte)
export const GET = withAuth(async (request) => {
  try {
    const db = getDatabase()
    const warehouses = db.prepare(`
      SELECT w.*,
        COALESCE(s.stock_count, 0) as stock_count,
        COALESCE(s.stock_value, 0) as stock_value
      FROM warehouses w
      LEFT JOIN (
        SELECT warehouse_id,
          COUNT(DISTINCT material_id) as stock_count,
          COALESCE(SUM(quantity), 0) as stock_value
        FROM stock_movements
        WHERE deleted_at IS NULL
        GROUP BY warehouse_id
      ) s ON s.warehouse_id = w.id
      WHERE w.deleted_at IS NULL
        AND w.company_id = ? AND w.branch_id = ?
      ORDER BY w.code ASC
    `).all(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)
    return NextResponse.json(warehouses)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Depo oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request) as WarehouseInput
    const { code, name } = body

    if (!code || !name) {
      return NextResponse.json({ error: 'code ve name gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO warehouses (id, code, name, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, code, name, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

    return NextResponse.json({ success: true, id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// DELETE: Depo pasife al
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    db.prepare('UPDATE warehouses SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL').run(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

