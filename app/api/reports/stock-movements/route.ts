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
    const materialId = searchParams.get('material_id') ?? ''
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '200', 10) || 200, 1000)

    const db = getDatabase()

    let whereClause = "WHERE (sm.deleted_at IS NULL OR sm.deleted_at = '')"
    const params: (string | number)[] = []

    if (from) {
      whereClause += ' AND sm.created_at >= ?'
      params.push(from)
    }
    if (to) {
      whereClause += ' AND sm.created_at <= ?'
      params.push(to + 'T23:59:59.999Z')
    }
    if (materialId) {
      whereClause += ' AND sm.material_id = ?'
      params.push(materialId)
    }

    params.push(limit)

    const rows = db.prepare(`
      SELECT
        sm.id,
        sm.material_id,
        sm.product_id,
        sm.movement_type,
        sm.quantity,
        sm.reference_type,
        sm.reference_id,
        sm.invoice_number,
        sm.shipment_number,
        sm.notes,
        sm.created_at,
        m.name AS material_name,
        m.code AS material_code,
        p.name AS product_name,
        p.sku AS product_sku
      FROM stock_movements sm
      LEFT JOIN materials m ON sm.material_id = m.id
      LEFT JOIN products p ON sm.product_id = p.id
      ${whereClause}
      ORDER BY sm.created_at DESC
      LIMIT ?
    `).all(...params) as Array<{
      id: string
      material_id: string | null
      product_id: string | null
      movement_type: string
      quantity: number
      reference_type: string | null
      reference_id: string | null
      invoice_number: string | null
      shipment_number: string | null
      notes: string | null
      created_at: string
      material_name: string | null
      material_code: string | null
      product_name: string | null
      product_sku: string | null
    }>

    const byType = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.movement_type] = (acc[r.movement_type] ?? 0) + 1
      return acc
    }, {})
    const totalInQty = rows.filter((r) => r.movement_type === 'in').reduce((s, r) => s + Number(r.quantity), 0)
    const totalOutQty = rows.filter((r) => r.movement_type === 'out').reduce((s, r) => s + Number(r.quantity), 0)

    return ok({
      from: from || null,
      to: to || null,
      summary: {
        total: rows.length,
        byType,
        totalInQty,
        totalOutQty,
      },
      items: rows,
    })
  }, { status: 500 })
})
