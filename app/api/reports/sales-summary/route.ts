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

    let whereClause = "WHERE (s.deleted_at IS NULL OR s.deleted_at = '')"
    const params: (string | number)[] = []

    if (from) {
      whereClause += ' AND (COALESCE(s.shipment_date, s.created_at) >= ?)'
      params.push(from)
    }
    if (to) {
      whereClause += ' AND (COALESCE(s.shipment_date, s.created_at) <= ?)'
      params.push(to + 'T23:59:59.999Z')
    }

    const rows = db.prepare(`
      SELECT
        s.id,
        s.shipment_number,
        s.shipment_date,
        s.final_amount,
        s.total_quantity,
        s.status,
        a.name AS customer_name,
        a.code AS customer_code
      FROM shipments s
      LEFT JOIN accounts a ON s.customer_id = a.id
      ${whereClause}
      ORDER BY s.shipment_date DESC, s.created_at DESC
      LIMIT 500
    `).all(...params) as Array<{
      id: string
      shipment_number: string
      shipment_date: string
      final_amount: number | null
      total_quantity: number | null
      status: string
      customer_name: string | null
      customer_code: string | null
    }>

    const totalAmount = rows.reduce((sum, r) => sum + (Number(r.final_amount) || 0), 0)
    const totalQuantity = rows.reduce((sum, r) => sum + (Number(r.total_quantity) || 0), 0)

    return ok({
      from: from || null,
      to: to || null,
      summary: {
        count: rows.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalQuantity,
      },
      items: rows,
    })
  }, { status: 500 })
})
