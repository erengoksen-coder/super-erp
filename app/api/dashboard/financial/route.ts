import { ok } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { getOrSetCache } from '@/lib/cache/memory'

type MonthlyTrendRow = {
  month: string
  revenue: number
  expense: number
}

export const GET = withAuth(async (request, user) => {
  return handleApi(async () => {
    const cacheKey = `dashboard:financial:${user.companyId}:${user.branchId}`
    
    const data = await getOrSetCache(cacheKey, 30_000, async () => {
      const db = getDatabase()
      const { companyId, branchId } = user

      // 1. Toplam Gelir (Satış Faturaları)
      const revenueResult = db.prepare(`
        SELECT SUM(final_amount) as total
        FROM invoices
        WHERE type = 'sale' AND company_id = ? AND branch_id = ? AND deleted_at IS NULL
      `).get(companyId, branchId) as { total: number | null }
      const totalRevenue = revenueResult?.total || 0

      // 2. Toplam Gider (Alış Faturaları)
      const expenseResult = db.prepare(`
        SELECT SUM(final_amount) as total
        FROM invoices
        WHERE type = 'purchase' AND company_id = ? AND branch_id = ? AND deleted_at IS NULL
      `).get(companyId, branchId) as { total: number | null }
      const totalExpense = expenseResult?.total || 0

      // 3. Bekleyen Tahsilatlar (Ödenmemiş Satış Faturaları)
      // Not: Şu an status 'issued' varsayıyoruz, 'paid' değilse bekleyendir.
      const pendingReceivables = db.prepare(`
        SELECT SUM(final_amount) as total
        FROM invoices
        WHERE type = 'sale' AND status != 'paid' AND company_id = ? AND branch_id = ? AND deleted_at IS NULL
      `).get(companyId, branchId) as { total: number | null }

      // 4. Son 6 Ay Gelir/Gider Trendi
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      
      const trends = db.prepare(`
        SELECT 
          strftime('%Y-%m', invoice_date) as month,
          SUM(CASE WHEN type = 'sale' THEN final_amount ELSE 0 END) as revenue,
          SUM(CASE WHEN type = 'purchase' THEN final_amount ELSE 0 END) as expense
        FROM invoices
        WHERE invoice_date >= ? AND company_id = ? AND branch_id = ? AND deleted_at IS NULL
        GROUP BY month
        ORDER BY month ASC
      `).all(sixMonthsAgo.toISOString().split('T')[0], companyId, branchId) as MonthlyTrendRow[]

      return {
        totalRevenue,
        totalExpense,
        netProfit: totalRevenue - totalExpense,
        pendingReceivables: pendingReceivables?.total || 0,
        monthlyTrends: trends,
      }
    })

    return ok(data, { headers: CACHE_HEADERS_SHORT })
  })
})
