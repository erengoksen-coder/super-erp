import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'

export const GET = withAuth(async (
  _request: NextRequest,
  _user,
  context?: { params?: Promise<{ id?: string }> | { id?: string } }
) => {
  try {
    // Next.js 15+ async params desteği
    const params = context?.params instanceof Promise ? await context.params : context?.params
    const rawId = params?.id ? decodeURIComponent(String(params.id)) : ''
    const id = rawId.trim()
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const query = `
      SELECT 
        po.*,
        p.name as product_name,
        p.sku,
        p.price as product_price,
        COALESCE(po.material_cost, 0) as material_cost,
        COALESCE(po.labor_cost, 0) as labor_cost,
        COALESCE(po.total_cost, 0) as total_cost,
        COALESCE(po.selling_price, 0) as selling_price,
        COALESCE(po.profit, 0) as profit,
        po.due_date,
        po.estimated_completion_date,
        po.started_at,
        po.completed_at,
        o.dealer_name,
        o.customer_name,
        o.order_number as customer_order_number,
        o.order_date,
        o.configuration,
        o.notes
      FROM production_orders po
      LEFT JOIN active_products p ON po.product_id = p.id
      LEFT JOIN active_orders o ON po.id = o.production_order_id
      WHERE po.company_id = ? AND po.branch_id = ? AND po.deleted_at IS NULL
        AND (
          po.id = ?
          OR po.order_number = ?
          OR o.order_number = ?
        )
      ORDER BY po.created_at DESC
      LIMIT 1
    `
    const order = db.prepare(query).get(
      DEFAULT_COMPANY_ID,
      DEFAULT_BRANCH_ID,
      id,
      id,
      id
    )

    if (!order) {
      return NextResponse.json({ error: 'Üretim emri bulunamadı' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
