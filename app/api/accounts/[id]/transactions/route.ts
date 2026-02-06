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
  description?: string | null
  product_id?: string | null
  quantity?: number | null
  unit_price?: number | null
  total_price?: number | null
  product_name?: string | null
  product_sku?: string | null
  shipment_number?: string | null
  shipment_discount_rate?: number | null
  shipment_discount_amount?: number | null
  shipment_status?: string | null
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

    // discount_rate kolonu yoksa 0 olarak kabul et
    let transactions: AccountTransactionRow[]
    try {
      transactions = db.prepare(`
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
          s.discount_amount as shipment_discount_amount,
          s.status as shipment_status
        FROM account_transactions at
        LEFT JOIN shipment_items si ON at.reference_id = si.id AND at.reference_type = 'shipment_item'
        LEFT JOIN shipments s ON si.shipment_id = s.id
        LEFT JOIN active_products p ON si.product_id = p.id
        WHERE at.account_id = ?
        ORDER BY at.created_at ASC
      `).all(accountId) as AccountTransactionRow[]

      // İptal edilen sevkiyat fişlerini cari listeden tamamen kaldır (sadece Sevk Fişleri'nde İptal görünsün)
      transactions = transactions.filter(
        (txn) => !(txn.reference_type === 'shipment_item' && txn.shipment_status === 'cancelled')
      )
    } catch (e: any) {
      // discount_rate kolonu yoksa, sadece diğer kolonları al
      if (e.message?.includes('no such column: discount_rate') || e.message?.includes('s.discount_rate')) {
        transactions = db.prepare(`
          SELECT 
            at.*,
            si.product_id,
            si.quantity,
            si.unit_price,
            si.total_price,
            p.name as product_name,
            p.sku as product_sku,
            s.shipment_number,
            0 as shipment_discount_rate,
            0 as shipment_discount_amount,
            s.status as shipment_status
          FROM account_transactions at
          LEFT JOIN shipment_items si ON at.reference_id = si.id AND at.reference_type = 'shipment_item'
          LEFT JOIN shipments s ON si.shipment_id = s.id
          LEFT JOIN active_products p ON si.product_id = p.id
          WHERE at.account_id = ?
          ORDER BY at.created_at ASC
        `).all(accountId) as AccountTransactionRow[]

        transactions = transactions.filter(
          (txn) => !(txn.reference_type === 'shipment_item' && txn.shipment_status === 'cancelled')
        )
        
        // İskonto bilgisini description'dan çıkar (eğer varsa)
        // Eğer shipment_discount_rate ve shipment_discount_amount zaten varsa, onları kullan
        // Yoksa description'dan parse et
        transactions = transactions.map(txn => {
          // Eğer zaten shipment_discount_rate ve shipment_discount_amount varsa, onları kullan
          if (txn.shipment_discount_rate && txn.shipment_discount_rate > 0 && txn.shipment_discount_amount && txn.shipment_discount_amount > 0) {
            return txn
          }
          
          // Description'dan parse et
          if (txn.description) {
            // İskonto bilgisini description'dan parse et
            // Format: "İskonto: %X.XX (Y.YY ₺)"
            const discountMatch = txn.description.match(/İskonto:\s*%([\d.]+)\s*\(([\d.]+)\s*₺\)/i)
            if (discountMatch) {
              txn.shipment_discount_rate = parseFloat(discountMatch[1])
              txn.shipment_discount_amount = parseFloat(discountMatch[2])
            } else {
              // Alternatif format: "İskonto: %X.XX (Y.YY TL)" veya sadece "%X.XX"
              const altMatch = txn.description.match(/İskonto:\s*%([\d.]+)/i)
              if (altMatch && txn.unit_price && txn.total_price) {
                const rate = parseFloat(altMatch[1])
                const bomTotal = txn.unit_price * (txn.quantity || 1)
                const discountAmount = bomTotal - txn.total_price
                if (discountAmount > 0) {
                  txn.shipment_discount_rate = rate
                  txn.shipment_discount_amount = discountAmount
                }
              } else if (txn.unit_price && txn.total_price && txn.quantity) {
                // Eğer description'da iskonto yoksa ama unit_price ve total_price farklıysa, iskonto hesapla
                const bomTotal = txn.unit_price * txn.quantity
                const actualTotal = txn.total_price || 0
                if (bomTotal > actualTotal && bomTotal > 0) {
                  const discountAmount = bomTotal - actualTotal
                  const discountRate = (discountAmount / bomTotal) * 100
                  if (discountRate > 0 && discountRate < 100) {
                    txn.shipment_discount_rate = discountRate
                    txn.shipment_discount_amount = discountAmount
                  }
                }
              }
            }
          }
          return txn
        })
      } else {
        throw e
      }
    }

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
