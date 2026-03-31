import { NextRequest } from 'next/server'
import { ok } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'

export const GET = withAuth(async (_request: NextRequest) => {
  return handleApi(async () => {
    const db = getDatabase()

    // Cari hesaplar (müşteri): balance > 0 alacaklar
    const rows = db.prepare(`
      SELECT
        a.id,
        a.code,
        a.name,
        a.balance,
        a.risk_limit,
        a.type,
        (SELECT MAX(at.created_at) FROM account_transactions at WHERE at.account_id = a.id) AS last_transaction_at
      FROM accounts a
      WHERE (a.deleted_at IS NULL OR a.deleted_at = '')
        AND (a.type = 'customer' OR a.type = 'musteri' OR LOWER(TRIM(a.type)) IN ('customer', 'musteri'))
        AND (a.balance IS NOT NULL AND a.balance > 0)
      ORDER BY a.balance DESC
    `).all() as Array<{
      id: string
      code: string | null
      name: string
      balance: number
      risk_limit: number | null
      type: string
      last_transaction_at: string | null
    }>

    const totalReceivables = rows.reduce((sum, r) => sum + (Number(r.balance) || 0), 0)

    const now = new Date()
    const items = rows.map((r) => {
      const lastAt = r.last_transaction_at ? new Date(r.last_transaction_at) : null
      const daysSince = lastAt ? Math.floor((now.getTime() - lastAt.getTime()) / (24 * 60 * 60 * 1000)) : null
      let agingBucket = 'current'
      if (daysSince != null) {
        if (daysSince > 90) agingBucket = '90+'
        else if (daysSince > 60) agingBucket = '61-90'
        else if (daysSince > 30) agingBucket = '31-60'
        else if (daysSince > 0) agingBucket = '1-30'
      }
      return {
        ...r,
        balance: Number(r.balance),
        risk_limit: r.risk_limit != null ? Number(r.risk_limit) : null,
        last_transaction_at: r.last_transaction_at,
        days_since_transaction: daysSince,
        aging_bucket: agingBucket,
      }
    })

    const byBucket = items.reduce<Record<string, number>>((acc, r) => {
      acc[r.aging_bucket] = (acc[r.aging_bucket] ?? 0) + r.balance
      return acc
    }, {})

    return ok({
      summary: {
        totalReceivables: Math.round(totalReceivables * 100) / 100,
        count: rows.length,
        byAgingBucket: byBucket,
      },
      items,
    })
  }, { status: 500 })
})
