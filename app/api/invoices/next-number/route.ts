import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { generateNextCode } from '@/lib/utils/codeGenerator'
import { ok, fail } from '@/lib/api/response'
import { getInvoicePrefixSale, getInvoicePrefixPurchase } from '@/lib/numberFormat'

/**
 * GET /api/invoices/next-number?type=purchase|sale
 * Returns the next invoice number for the given type (for display on new invoice form).
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const type = (searchParams.get('type') ?? 'purchase').trim().toLowerCase() as 'sale' | 'purchase'
    if (type !== 'sale' && type !== 'purchase') {
      return fail('Tip satış veya alış olmalı', { status: 400 })
    }
    const prefix = type === 'sale' ? getInvoicePrefixSale() : getInvoicePrefixPurchase()
    const year = new Date().getFullYear()
    const prefixWithYear = `${prefix}-${year}`
    const db = getDatabase()
    const row = db.prepare(
      `SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? AND deleted_at IS NULL ORDER BY invoice_number DESC LIMIT 1`
    ).get(`${prefixWithYear}-%`) as { invoice_number?: string } | undefined
    const nextNumber = generateNextCode(row?.invoice_number ?? null, { prefix: prefixWithYear, padding: 3 })
    return ok({ nextNumber })
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Sıradaki fatura numarası oluşturulamadı', { status: 500 })
  }
})
