import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { getDatabase } from '@/lib/database/db'

/**
 * POST: Carideki iskonto oranını bu carinin tüm sevkiyat fişlerine bir seferlik uygula.
 * Cari detay sayfasından tek tıkla tetiklenir; carideki güncel discount_rate kullanılır.
 * Bayi kullanıcıları cari işlemlerde sadece bilgi görüntüleyebilir, düzenleme yapamaz.
 */
export const POST = withAuth(async (
  request: NextRequest,
  user: { role?: string },
  context?: unknown
) => {
  const role = (user?.role ?? '').toString().trim().toLowerCase()
  if (role === 'bayi') {
    return fail('Bayi kullanıcıları cari üzerinde düzenleme yapamaz.', { status: 403 })
  }
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id?: string } | Promise<{ id?: string }> } | undefined)?.params
    )
    const accountId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).slice(-2)[0]
    if (!accountId) {
      return fail('Cari ID gerekli', { status: 400 })
    }

    const db = getDatabase()
    const account = db.prepare(`
      SELECT id, COALESCE(discount_rate, 0) as discount_rate FROM accounts WHERE id = ? AND deleted_at IS NULL
    `).get(accountId) as { id: string; discount_rate: number } | undefined

    if (!account) {
      return fail('Cari hesap bulunamadı', { status: 404 })
    }

    const newRate = Number(account.discount_rate) || 0
    const shipments = db.prepare(`
      SELECT id, shipment_number, total_amount, discount_rate, discount_amount, tax_rate, tax_amount, final_amount
      FROM shipments WHERE customer_id = ? AND deleted_at IS NULL
    `).all(accountId) as Array<{
      id: string; shipment_number: string; total_amount: number; discount_rate: number | null;
      discount_amount: number | null; tax_rate: number | null; tax_amount: number | null; final_amount: number | null;
    }>

    if (shipments.length === 0) {
      return ok(
        { updated_count: 0 },
        { message: 'Bu caride güncellenecek sevkiyat fişi bulunamadı.' }
      )
    }

    db.transaction(() => {
      for (const s of shipments) {
        const totalAmount = s.total_amount ?? 0
        const newDiscountAmount = (totalAmount * newRate) / 100
        const amountAfterDiscount = totalAmount - newDiscountAmount
        const taxRate = s.tax_rate ?? 0
        const newTaxAmount = (amountAfterDiscount * taxRate) / 100
        const newFinalAmount = amountAfterDiscount + newTaxAmount
        db.prepare(`
          UPDATE shipments SET discount_rate = ?, discount_amount = ?, tax_amount = ?, final_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(newRate, newDiscountAmount, newTaxAmount, newFinalAmount, s.id)

        const items = db.prepare(`
          SELECT id, quantity, unit_price, total_price
          FROM shipment_items WHERE shipment_id = ? AND (deleted_at IS NULL OR deleted_at = '')
        `).all(s.id) as Array<{ id: string; quantity: number; unit_price: number | null; total_price: number | null }>
        for (const item of items) {
          const unitPrice = item.unit_price ?? 0
          const itemTotalBefore = unitPrice * (item.quantity || 0)
          const itemDiscountAmount = (itemTotalBefore * newRate) / 100
          const newItemTotal = itemTotalBefore - itemDiscountAmount
          db.prepare(`UPDATE shipment_items SET total_price = ? WHERE id = ?`).run(newItemTotal, item.id)

          const itemTaxAmount = amountAfterDiscount > 0 ? (newItemTotal / amountAfterDiscount) * newTaxAmount : 0
          const itemFinalAmount = newItemTotal + itemTaxAmount
          const productRow = db.prepare(`
            SELECT p.name as product_name, p.sku as product_sku FROM shipment_items si
            JOIN active_products p ON si.product_id = p.id WHERE si.id = ?
          `).get(item.id) as { product_name?: string; product_sku?: string } | undefined
          const productName = productRow?.product_name || 'Ürün'
          const productSku = productRow?.product_sku || ''
          let description = `Sevkiyat: ${s.shipment_number} | Ürün: ${productName}${productSku ? ` (${productSku})` : ''} | Adet: ${item.quantity} | Birim Fiyat (BOM): ${unitPrice.toFixed(2)} ₺`
          if (newRate > 0 && itemDiscountAmount > 0) {
            description += ` | İskonto: %${newRate.toFixed(2)} (${itemDiscountAmount.toFixed(2)} ₺)`
          }
          if (taxRate > 0 && itemTaxAmount > 0) {
            description += ` | KDV: %${taxRate.toFixed(2)} (${itemTaxAmount.toFixed(2)} ₺)`
          }
          description += ` | Toplam: ${itemFinalAmount.toFixed(2)} ₺`
          db.prepare(`
            UPDATE account_transactions SET amount = ?, description = ? WHERE reference_type = 'shipment_item' AND reference_id = ?
          `).run(itemFinalAmount, description, item.id)
        }
      }
      const balanceRow = db.prepare(`
        SELECT COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) -
               COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) AS balance
        FROM account_transactions WHERE account_id = ?
      `).get(accountId) as { balance: number }
      db.prepare(`UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(balanceRow.balance, accountId)
    })()

    return ok(
      { updated_count: shipments.length },
      { message: `${shipments.length} adet sevkiyat fişine %${newRate.toFixed(2)} iskonto uygulandı.` }
    )
  } catch (error: any) {
    return fail(error.message || 'İşlem yapılamadı', { status: 500 })
  }
})
