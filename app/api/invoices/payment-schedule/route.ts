import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

// GET: Ödeme takvimi — vadesi olan faturalar, vade tarihine göre
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') // YYYY-MM-DD
    const to = searchParams.get('to')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500)

    const db = getDatabase()
    let where = 'i.deleted_at IS NULL AND (i.due_date IS NOT NULL AND i.due_date != \'\')'
    const params: (string | number)[] = []
    if (from) {
      where += ' AND date(i.due_date) >= date(?)'
      params.push(from)
    }
    if (to) {
      where += ' AND date(i.due_date) <= date(?)'
      params.push(to)
    }

    const rows = db.prepare(`
      SELECT 
        i.id, i.invoice_number, i.invoice_date, i.due_date, i.final_amount,
        i.payment_terms_days, i.customer_id,
        a.name as customer_name, a.code as customer_code,
        (i.final_amount - COALESCE((
          SELECT SUM(p.amount) FROM payments p 
          WHERE p.invoice_id = i.id AND p.deleted_at IS NULL
        ), 0)) as amount_due
      FROM invoices i
      JOIN accounts a ON i.customer_id = a.id
      WHERE ${where}
      ORDER BY date(i.due_date) ASC
      LIMIT ?
    `).all(...params, limit) as any[]

    return ok(rows)
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})
