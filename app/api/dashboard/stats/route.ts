import { ok } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { getOrSetCache } from '@/lib/cache/memory'

type MaterialStockRow = {
  stock_amount: number | null
  min_stock_level: number | null
  unit_price: number | null
}

type CountRow = {
  count: number | null
}

type ProductionTrendRow = {
  date: string
  count: number | null
  total_quantity: number | null
}

type StationStatRow = {
  current_station: string
  count: number | null
  total_quantity: number | null
}

/**
 * Super ERP - Dashboard Stats API
 * Agi-OS Platinum Version: Optimized with Pipeline Turnover & Aging
 */
export const GET = withAuth(async (request, user) => {
  return handleApi(async () => {
    const { companyId, branchId } = user
    const cacheKey = `dashboard:stats:${companyId}:${branchId}`

    const data = await getOrSetCache(cacheKey, 15_000, async () => {
      const db = getDatabase()

      // 1. Total Stock Value
      const materials = db
        .prepare('SELECT stock_amount, min_stock_level, COALESCE(unit_price, 0) as unit_price FROM materials WHERE deleted_at IS NULL AND company_id = ? AND branch_id = ?')
        .all(companyId, branchId) as MaterialStockRow[]
      const totalStockValue = materials.reduce((sum, m) => sum + (m.stock_amount || 0) * (m.unit_price ?? 0), 0)

      // 2. Pending Production
      const pendingProduction = db.prepare(`
        SELECT COUNT(*) as count 
        FROM production_orders 
        WHERE status IN ('pending', 'in_progress') AND company_id = ? AND branch_id = ? AND deleted_at IS NULL
      `).get(companyId, branchId) as CountRow | undefined

      // 3. Critical Stock
      const criticalStock = db.prepare(`
        SELECT COUNT(*) as count 
        FROM materials 
        WHERE deleted_at IS NULL AND company_id = ? AND branch_id = ? AND min_stock_level IS NOT NULL AND (stock_amount IS NULL OR stock_amount < min_stock_level)
      `).get(companyId, branchId) as CountRow | undefined

      // 4. Monthly Turnover & Pipeline
      const now = new Date()
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const salesThisMonthRow = db.prepare(`
        SELECT COALESCE(SUM(CAST(final_amount AS REAL)), 0) as total
        FROM shipments
        WHERE deleted_at IS NULL AND (shipment_date >= ? OR created_at >= ?)
          AND company_id = ? AND branch_id = ?
      `).get(monthStart, monthStart, companyId, branchId) as { total: number }
      
      const salesThisMonth = Number(salesThisMonthRow?.total ?? 0)
      
      // Calculate Pipeline if actual sales are 0
      let pipelineTotal = salesThisMonth;
      const isPipeline = (salesThisMonth === 0);
      if (isPipeline) {
        const pipelineRow = db.prepare(`
          SELECT COALESCE(SUM(CAST(total_amount AS REAL)), 0) as total
          FROM orders
          WHERE deleted_at IS NULL AND status != 'cancelled'
            AND company_id = ? AND branch_id = ?
        `).get(companyId, branchId) as { total: number }
        pipelineTotal = Number(pipelineRow?.total ?? 0)
      }

      // 5. Overdue and Pending Metrics
      const overdueOrdersRow = db.prepare(`
        SELECT COUNT(*) as count FROM orders
        WHERE deleted_at IS NULL AND delivery_date IS NOT NULL AND status NOT IN ('completed', 'cancelled')
          AND date(delivery_date) < date('now')
          AND company_id = ? AND branch_id = ?
      `).get(companyId, branchId) as CountRow | undefined
      
      const pendingApprovalRow = db.prepare(`
        SELECT COUNT(*) as count FROM shipments
        WHERE deleted_at IS NULL AND approval_status = 'pending' AND company_id = ? AND branch_id = ?
      `).get(companyId, branchId) as CountRow | undefined

      // 6. Aging Analysis
      let aging = { range_0_30: 0, range_30_60: 0, range_60_90: 0, range_90_plus: 0 }
      const agingRows = db.prepare(`
        SELECT
          SUM(CASE WHEN julianday('now') - julianday(created_at) <= 30 THEN CAST(amount AS REAL) ELSE 0 END) as r0,
          SUM(CASE WHEN julianday('now') - julianday(created_at) > 30 AND julianday('now') - julianday(created_at) <= 60 THEN CAST(amount AS REAL) ELSE 0 END) as r30,
          SUM(CASE WHEN julianday('now') - julianday(created_at) > 60 AND julianday('now') - julianday(created_at) <= 90 THEN CAST(amount AS REAL) ELSE 0 END) as r60,
          SUM(CASE WHEN julianday('now') - julianday(created_at) > 90 THEN CAST(amount AS REAL) ELSE 0 END) as r90
        FROM account_transactions
        WHERE transaction_type = 'debit' AND deleted_at IS NULL AND company_id = ? AND branch_id = ?
      `).get(companyId, branchId) as any
      if (agingRows) {
        aging = {
          range_0_30: Math.round(agingRows.r0 || 0),
          range_30_60: Math.round(agingRows.r30 || 0),
          range_60_90: Math.round(agingRows.r60 || 0),
          range_90_plus: Math.round(agingRows.r90 || 0),
        }
      }

      return {
        totalStockValue,
        pendingProduction: pendingProduction?.count || 0,
        criticalStock: criticalStock?.count || 0,
        salesThisMonth: pipelineTotal,
        pipelineTotal: Math.round(pipelineTotal),
        isPipeline,
        overdueOrders: overdueOrdersRow?.count || 0,
        pendingApprovalCount: pendingApprovalRow?.count || 0,
        aging,
        updatedAt: new Date().toISOString()
      }
    })

    return ok(data, { headers: CACHE_HEADERS_SHORT })
  })
})
