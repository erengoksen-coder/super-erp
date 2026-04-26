import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { randomUUID } from 'crypto'

export const POST = withAuth(async (
  _request: NextRequest,
  user: { role?: string },
  context?: unknown
) => {
  const role = (user?.role ?? '').toString().trim().toLowerCase()
  if (role === 'bayi') return fail('Yetkisiz işlem', { status: 403 })

  try {
    const db = getDatabase()
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id?: string } | Promise<{ id?: string }> } | undefined)?.params
    )
    const accountId = resolvedParams?.id
    if (!accountId) return fail('ID gerekli', { status: 400 })

    const results = { created: 0, existing: 0 }

    db.transaction(() => {
      // 1. Bu hesaba ait tüm sevkiyat kalemlerini bul
      const items = db.prepare(`
        SELECT 
          si.id, 
          si.total_price, 
          si.quantity, 
          si.unit_price,
          s.shipment_number,
          s.tax_rate,
          s.tax_amount,
          s.discount_rate as shipment_discount_rate,
          s.final_amount as shipment_final_amount,
          s.total_amount as shipment_total_amount,
          p.name as product_name,
          p.sku as product_sku
        FROM shipment_items si
        JOIN shipments s ON si.shipment_id = s.id
        LEFT JOIN active_products p ON si.product_id = p.id
        WHERE s.customer_id = ? AND si.deleted_at IS NULL AND s.deleted_at IS NULL
      `).all(accountId) as any[]

      for (const item of items) {
        // 2. Transaction var mı kontrol et
        const existing = db.prepare(`
          SELECT id FROM account_transactions 
          WHERE account_id = ? AND reference_type = 'shipment_item' AND reference_id = ?
        `).get(accountId, item.id)

        if (existing) {
          results.existing++
          continue
        }

        // 3. Yoksa oluştur
        const transactionId = randomUUID()
        
        // KDV dahil tutarı hesapla (kalem bazında basit orantı)
        // Eğer sevkiyatın total_amount (ara toplam) varsa orantı kur, yoksa kalem fiyatını kullan
        const shipmentTotal = item.shipment_total_amount || 0
        const itemTax = shipmentTotal > 0 
          ? (item.total_price / shipmentTotal) * (item.tax_amount || 0)
          : 0
        const finalAmount = item.total_price + itemTax

        let description = `[Sync] Sevkiyat: ${item.shipment_number} | Ürün: ${item.product_name || 'Ürün'} | Adet: ${item.quantity}`
        if (item.shipment_discount_rate > 0) {
            description += ` | İskonto: %${item.shipment_discount_rate.toFixed(2)}`
        }
        description += ` | Toplam: ${finalAmount.toFixed(2)} ₺`

        db.prepare(`
          INSERT INTO account_transactions 
          (id, account_id, transaction_type, amount, reference_type, reference_id, description, created_at)
          VALUES (?, ?, 'debit', ?, 'shipment_item', ?, ?, CURRENT_TIMESTAMP)
        `).run(transactionId, accountId, finalAmount, item.id, description)
        
        results.created++
      }

      // 4. Bakiyeyi güncelle
      const balanceRow = db.prepare(`
        SELECT COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) -
               COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) AS balance
        FROM account_transactions WHERE account_id = ?
      `).get(accountId) as { balance: number }
      
      db.prepare('UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(balanceRow.balance, accountId)
    })()

    return ok({ ...results, message: `${results.created} hareket eklendi, ${results.existing} hareket zaten vardı.` })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})
