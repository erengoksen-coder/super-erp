import { NextRequest } from 'next/server'
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
  created_at?: string
  running_balance?: number
}

// GET: Cari hesap işlemlerini getir
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const db = getDatabase()
    const resolvedParams = await Promise.resolve(params)
    const accountId = resolvedParams.id

    const transactions = db.prepare(`
      SELECT 
        at.*,
        si.product_id,
        si.quantity,
        si.unit_price,
        si.total_price,
        p.name as product_name,
        p.sku as product_sku,
        s.shipment_number
      FROM account_transactions at
      LEFT JOIN shipment_items si ON at.reference_id = si.id AND at.reference_type = 'shipment_item'
      LEFT JOIN shipments s ON si.shipment_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
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
}
