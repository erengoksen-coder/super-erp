import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { format, subMonths } from 'date-fns'

export const GET = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId } = authUser
    const db = getDatabase()
    const today = format(new Date(), 'yyyy-MM-dd')
    const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM-dd')

    // 1. Kasa & Banka Bakiyesi (100, 102 kodları)
    const liquidAssets = db.prepare(`
      SELECT 
        SUM(CASE WHEN account_code LIKE '100%' THEN (debit - credit) ELSE 0 END) as cash_balance,
        SUM(CASE WHEN account_code LIKE '102%' THEN (debit - credit) ELSE 0 END) as bank_balance
      FROM journal_entries
      WHERE company_id = ? AND branch_id = ? AND deleted_at IS NULL
    `).get(companyId, branchId) as any

    // 2. Geciken Alacaklar (120 kodlu hesaplar, vade kontrolü faturalardan gelebilir ama basitçe bakiye)
    const receivables = db.prepare(`
      SELECT SUM(debit - credit) as total
      FROM journal_entries
      WHERE account_code LIKE '120%' AND company_id = ? AND branch_id = ? AND deleted_at IS NULL
    `).get(companyId, branchId) as any

    // 3. Dönemlik Gelir/Gider (600 ve 700'lü hesaplar)
    const performance = db.prepare(`
      SELECT 
        SUM(CASE WHEN account_code LIKE '600%' THEN (credit - debit) ELSE 0 END) as monthly_income,
        SUM(CASE WHEN account_code LIKE '7%' THEN (debit - credit) ELSE 0 END) as monthly_expense
      FROM journal_entries
      WHERE company_id = ? AND branch_id = ? AND deleted_at IS NULL
        AND date BETWEEN ? AND ?
    `).get(companyId, branchId, lastMonth, today) as any

    return ok({
      cash: liquidAssets?.cash_balance || 0,
      bank: liquidAssets?.bank_balance || 0,
      receivables: receivables?.total || 0,
      income: performance?.monthly_income || 0,
      expense: performance?.monthly_expense || 0,
      period: { start: lastMonth, end: today }
    })
  })
})
