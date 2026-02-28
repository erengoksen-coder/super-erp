import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok } from '@/lib/api/response'

/**
 * BA/BS Formu Raporu
 * BA (Form Ba): Aylık 5.000 TL üstü alımlar (tedarikçi bazlı)
 * BS (Form Bs): Aylık 5.000 TL üstü satışlar (müşteri bazlı)
 */
const BA_BS_THRESHOLD = 5000

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10)
    const threshold = parseInt(searchParams.get('threshold') || String(BA_BS_THRESHOLD), 10)

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endMonth = month === 12 ? 1 : month + 1
    const endYear = month === 12 ? year + 1 : year
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

    const db = getDatabase()

    // BS (Form Bs) - Satış faturaları → müşteri bazlı toplam
    const bsRows = db.prepare(`
      SELECT 
        a.id as account_id,
        a.name as account_name,
        a.code as account_code,
        a.tax_number,
        COUNT(i.id) as invoice_count,
        SUM(i.final_amount) as total_amount
      FROM invoices i
      JOIN accounts a ON i.customer_id = a.id
      WHERE i.type = 'sale'
        AND i.status != 'cancelled'
        AND i.invoice_date >= ? AND i.invoice_date < ?
        AND i.deleted_at IS NULL
      GROUP BY a.id, a.name, a.code, a.tax_number
      HAVING SUM(i.final_amount) >= ?
      ORDER BY SUM(i.final_amount) DESC
    `).all(startDate, endDate, threshold) as any[]

    // BA (Form Ba) - Alış faturaları → tedarikçi bazlı toplam
    const baRows = db.prepare(`
      SELECT 
        a.id as account_id,
        a.name as account_name,
        a.code as account_code,
        a.tax_number,
        COUNT(i.id) as invoice_count,
        SUM(i.final_amount) as total_amount
      FROM invoices i
      JOIN accounts a ON i.customer_id = a.id
      WHERE i.type = 'purchase'
        AND i.status != 'cancelled'
        AND i.invoice_date >= ? AND i.invoice_date < ?
        AND i.deleted_at IS NULL
      GROUP BY a.id, a.name, a.code, a.tax_number
      HAVING SUM(i.final_amount) >= ?
      ORDER BY SUM(i.final_amount) DESC
    `).all(startDate, endDate, threshold) as any[]

    // Toplam özet
    const bsTotal = bsRows.reduce((s: number, r: any) => s + (r.total_amount || 0), 0)
    const baTotal = baRows.reduce((s: number, r: any) => s + (r.total_amount || 0), 0)

    return ok({
      period: { year, month, threshold },
      bs: {
        title: 'Form Bs – Mal ve Hizmet Satışları',
        rows: bsRows,
        total: bsTotal,
        count: bsRows.length,
      },
      ba: {
        title: 'Form Ba – Mal ve Hizmet Alımları',
        rows: baRows,
        total: baTotal,
        count: baRows.length,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
