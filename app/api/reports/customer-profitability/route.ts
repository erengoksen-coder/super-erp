import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'

export const GET = withAuth(async (request) => {
  try {
    const db = getDatabase()
    console.log('[API] Using company_id:', DEFAULT_COMPANY_ID)

    // Müşteri bazlı satış ve karlılık
    const rows = db.prepare(`
      SELECT
        a.id as account_id,
        a.name as customer_name,
        a.type as account_type,
        COALESCE(s.total_sales, 0) as total_sales,
        COALESCE(s.shipment_count, 0) as shipment_count,
        COALESCE(a.balance, 0) as balance,
        COALESCE(t.total_paid, 0) as total_paid
      FROM accounts a
      LEFT JOIN (
        SELECT
          customer_id,
          SUM(final_amount) as total_sales,
          COUNT(*) as shipment_count
        FROM shipments
        WHERE deleted_at IS NULL
        GROUP BY customer_id
      ) s ON s.customer_id = a.id
      LEFT JOIN (
        SELECT
          account_id,
          SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END) as total_paid
        FROM account_transactions
        WHERE deleted_at IS NULL
        GROUP BY account_id
      ) t ON t.account_id = a.id
      WHERE a.deleted_at IS NULL
      ORDER BY COALESCE(s.total_sales, 0) DESC, ABS(a.balance) DESC
    `).all() as any[]

    console.log('[API] Rows found:', (rows || []).length)

    const result = rows.map(r => ({
      ...r,
      total_sales: Number(r.total_sales || 0),
      total_paid: Number(r.total_paid || 0),
      balance: Number(r.balance || 0),
      collection_rate: (r.total_sales || 0) > 0
        ? Math.round((Number(r.total_paid || 0) / Number(r.total_sales || 0)) * 10000) / 100
        : 0,
    }))

    // Özet
    const summary = {
      total_customers: result.length,
      total_revenue: result.reduce((s: number, r: any) => s + r.total_sales, 0),
      total_collected: result.reduce((s: number, r: any) => s + r.total_paid, 0),
      total_receivable: result.reduce((s: number, r: any) => s + r.balance, 0),
      avg_collection_rate: result.length > 0
        ? Math.round(result.reduce((s: number, r: any) => s + (r.collection_rate || 0), 0) / result.length * 100) / 100
        : 0,
    }

    return ok({ customers: result, summary })
  } catch (error: any) {
    console.error('[API] Customer Profitability Error:', error)
    return fail(error.message, { status: 500 })
  }
})
