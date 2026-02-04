import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

type AccountTransactionRow = {
  id: string
  account_id: string
  transaction_type: string
  amount: number
  reference_type: string | null
  reference_id: string | null
  product_id?: string | null
  quantity?: number | null
  unit_price?: number | null
  total_price?: number | null
  product_name?: string | null
  product_sku?: string | null
  shipment_number?: string | null
  shipment_discount_rate?: number | null
  shipment_discount_amount?: number | null
  created_at?: string
  running_balance?: number
}

// GET: Cari hesap işlemlerini getir
export const GET = withAuth(async (
  request: NextRequest,
  _user,
  context?: unknown
) => {
  try {
    const db = getDatabase()
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id?: string } | Promise<{ id?: string }> } | undefined)?.params
    )
    const accountId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).pop()
    if (!accountId) {
      return fail('ID gerekli', { status: 400 })
    }

    const transactions = db.prepare(`
      SELECT 
        at.*,
        si.product_id,
        si.quantity,
        si.unit_price,
        si.total_price,
        p.name as product_name,
        p.sku as product_sku,
        s.shipment_number,
        s.discount_rate as shipment_discount_rate,
        s.discount_amount as shipment_discount_amount
      FROM account_transactions at
      LEFT JOIN shipment_items si ON at.reference_id = si.id AND at.reference_type = 'shipment_item'
      LEFT JOIN shipments s ON si.shipment_id = s.id
      LEFT JOIN active_products p ON si.product_id = p.id
      WHERE at.account_id = ?
      ORDER BY at.created_at ASC
    `).all(accountId) as AccountTransactionRow[]

    let running = 0
    const withRunning = transactions.map((transaction) => {
      if (transaction.transaction_type === 'debit') {
        running += transaction.amount
      } else if (transaction.transaction_type === 'credit') {
        running -= transaction.amount
      }
      return { ...transaction, running_balance: running }
    }).reverse()

    return ok(withRunning)
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
});
