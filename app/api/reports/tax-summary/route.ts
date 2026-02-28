import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

/**
 * GET: KDV / vergi özet raporu. Faturaları vergi oranına göre gruplar.
 * Query: from, to (YYYY-MM-DD)
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''

    const db = getDatabase()
    const where: string[] = ['i.deleted_at IS NULL']
    const params: (string | number)[] = []
    if (from) {
      where.push('i.invoice_date >= ?')
      params.push(from)
    }
    if (to) {
      where.push('i.invoice_date <= ?')
      params.push(to)
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const rows = db.prepare(`
      SELECT
        COALESCE(i.tax_rate, 0) AS tax_rate,
        COUNT(*) AS invoice_count,
        SUM(COALESCE(i.tax_amount, 0)) AS total_tax,
        SUM(COALESCE(i.final_amount, 0)) AS total_final,
        SUM(COALESCE(i.total_amount, 0)) AS total_before_tax
      FROM invoices i
      ${whereSql}
      GROUP BY COALESCE(i.tax_rate, 0)
      ORDER BY i.tax_rate ASC
    `).all(...params) as Array<{
      tax_rate: number
      invoice_count: number
      total_tax: number
      total_final: number
      total_before_tax: number
    }>

    const summary = {
      totalInvoices: rows.reduce((s, r) => s + (r.invoice_count || 0), 0),
      totalTax: rows.reduce((s, r) => s + (r.total_tax || 0), 0),
      totalFinal: rows.reduce((s, r) => s + (r.total_final || 0), 0),
      byRate: rows.map((r) => ({
        tax_rate: r.tax_rate,
        tax_rate_label: r.tax_rate === 0 ? '%0' : `%${Number(r.tax_rate)}`,
        invoice_count: r.invoice_count,
        total_tax: r.total_tax,
        total_final: r.total_final,
        total_before_tax: r.total_before_tax,
      })),
    }

    return NextResponse.json({ data: summary, from, to })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Rapor alınamadı'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
