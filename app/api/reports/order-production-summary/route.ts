import { NextRequest } from 'next/server'
import { ok } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'

export const GET = withAuth(async (request: NextRequest) => {
  return handleApi(async () => {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') ?? ''
    const to = searchParams.get('to') ?? ''

    const db = getDatabase()

    const companyBranch = [DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID]
    const orderWhere = "deleted_at IS NULL AND (company_id = ? OR company_id IS NULL OR company_id = '') AND (branch_id = ? OR branch_id IS NULL OR branch_id = '')"
    const orderDateFilter = from && to
      ? ' AND date(COALESCE(order_date, created_at)) >= ? AND date(COALESCE(order_date, created_at)) <= ?'
      : ''

    const orderStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM orders
      WHERE ${orderWhere}${orderDateFilter}
    `).get(...companyBranch, ...(from && to ? [from, to] : [])) as { count: number; total: number }

    const productionWhere = "deleted_at IS NULL AND (company_id = ? OR company_id IS NULL OR company_id = '') AND (branch_id = ? OR branch_id IS NULL OR branch_id = '')"
    const productionDateFilter = from && to
      ? ' AND date(created_at) >= ? AND date(created_at) <= ?'
      : ''
    const productionStats = db.prepare(`
      SELECT COUNT(*) as count
      FROM production_orders
      WHERE ${productionWhere}${productionDateFilter}
    `).get(...companyBranch, ...(from && to ? [from, to] : [])) as { count: number }

    let shipmentWhere = "WHERE (deleted_at IS NULL OR deleted_at = '')"
    const shipmentParams: string[] = []
    if (from) {
      shipmentWhere += ' AND (COALESCE(shipment_date, created_at) >= ?)'
      shipmentParams.push(from)
    }
    if (to) {
      shipmentWhere += ' AND (COALESCE(shipment_date, created_at) <= ?)'
      shipmentParams.push(to + 'T23:59:59.999Z')
    }
    const shipmentStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(CAST(final_amount AS REAL)), 0) as total, COALESCE(SUM(CAST(total_quantity AS REAL)), 0) as total_qty
      FROM shipments
      ${shipmentWhere}
    `).get(...shipmentParams) as { count: number; total: number; total_qty: number }

    return ok({
      from: from || null,
      to: to || null,
      orders: {
        count: Number(orderStats?.count ?? 0),
        totalAmount: Math.round(Number(orderStats?.total ?? 0) * 100) / 100,
      },
      production: {
        count: Number(productionStats?.count ?? 0),
      },
      shipments: {
        count: Number(shipmentStats?.count ?? 0),
        totalAmount: Math.round(Number(shipmentStats?.total ?? 0) * 100) / 100,
        totalQuantity: Number(shipmentStats?.total_qty ?? 0),
      },
    })
  }, { status: 500 })
})
