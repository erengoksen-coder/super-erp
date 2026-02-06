import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

type ShipmentRow = {
  id: string
  customer_id: string
  shipment_number?: string | null
  total_amount?: number | null
  final_amount?: number | null
  discount_rate?: number | null
  discount_amount?: number | null
}

type ShipmentTaxInput = {
  tax_rate?: number
}

// PATCH: Sevkiyat KDV oranını güncelle
export const PATCH = withAuth(async (
  request: NextRequest, user,
  context?: unknown
) => {
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params
    )
    if (!resolvedParams?.id) {
      return fail('ID gerekli', { status: 400 })
    }
    const shipmentId = resolvedParams.id
    const body = await parseJsonBody(request) as ShipmentTaxInput
    const { tax_rate } = body

    if (tax_rate === undefined || tax_rate < 0 || tax_rate > 100) {
      return fail('KDV oranı 0-100 arasında olmalıdır', { status: 400 })
    }

    const db = getDatabase()

    // Sevkiyatı bul
    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(shipmentId) as ShipmentRow | undefined
    if (!shipment) {
      return fail('Sevkiyat bulunamadı', { status: 404 })
    }

    // KDV hesapla
    const totalAmount = shipment.total_amount || 0
    const discountRate = shipment.discount_rate || 0
    const discountAmount = shipment.discount_amount || 0
    const amountAfterDiscount = totalAmount - discountAmount
    const newTaxRate = parseFloat(tax_rate.toString())
    const newTaxAmount = (amountAfterDiscount * newTaxRate) / 100
    const newFinalAmount = amountAfterDiscount + newTaxAmount

    // Eski ve yeni farkı hesapla (cari hesap bakiyesi için)
    const oldFinalAmount = shipment.final_amount || shipment.total_amount || 0
    const balanceDifference = newFinalAmount - oldFinalAmount

    db.transaction(() => {
      // Sevkiyat KDV bilgilerini güncelle
      db.prepare(`
        UPDATE shipments
        SET tax_rate = ?,
            tax_amount = ?,
            final_amount = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newTaxRate, newTaxAmount, newFinalAmount, shipmentId)

      // Account transactions'ları güncelle (KDV dahil tutar)
      const items = db.prepare(`
        SELECT si.*, p.name as product_name, p.sku as product_sku
        FROM shipment_items si
        JOIN active_products p ON si.product_id = p.id
        WHERE si.shipment_id = ? AND si.deleted_at IS NULL
      `).all(shipmentId) as Array<{
        id: string
        total_price: number
        quantity: number
        unit_price: number
        product_name: string
        product_sku: string
      }>

      for (const item of items) {
        // Kalem bazında iskonto ve KDV hesapla
        const itemTotal = item.total_price || 0
        const itemDiscountAmount = (itemTotal * discountRate) / 100
        const itemAmountAfterDiscount = itemTotal - itemDiscountAmount
        const itemTaxAmount = amountAfterDiscount > 0 ? (itemAmountAfterDiscount / amountAfterDiscount) * newTaxAmount : 0
        const itemFinalAmount = itemAmountAfterDiscount + itemTaxAmount

        // Account transaction'ı bul ve güncelle
        const transaction = db.prepare(`
          SELECT * FROM account_transactions 
          WHERE reference_id = ? AND reference_type = 'shipment_item'
        `).get(item.id)

        if (transaction) {
          // Açıklamayı güncelle
          let description = `Sevkiyat: ${shipment.shipment_number} | Ürün: ${item.product_name}${item.product_sku ? ` (${item.product_sku})` : ''} | Adet: ${item.quantity} | Birim Fiyat (BOM): ${item.unit_price.toFixed(2)} ₺`
          
          if (discountRate > 0 && itemDiscountAmount > 0) {
            description += ` | İskonto: %${discountRate.toFixed(2)} (${itemDiscountAmount.toFixed(2)} ₺)`
          }
          
          if (newTaxRate > 0 && itemTaxAmount > 0) {
            description += ` | KDV: %${newTaxRate.toFixed(2)} (${itemTaxAmount.toFixed(2)} ₺)`
          }
          
          description += ` | Toplam: ${itemFinalAmount.toFixed(2)} ₺`

          // Transaction'ı güncelle
          db.prepare(`
            UPDATE account_transactions 
            SET amount = ?, description = ?
            WHERE id = ?
          `).run(itemFinalAmount, description, transaction.id)
        }
      }

      // Müşteri cari hesap bakiyesini güncelle
      if (balanceDifference !== 0) {
        db.prepare(`
          UPDATE accounts
          SET balance = balance + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(balanceDifference, shipment.customer_id)
      }
    })()

    return ok(
      {
        shipment: {
          ...shipment,
          tax_rate: newTaxRate,
          tax_amount: newTaxAmount,
          final_amount: newFinalAmount,
        },
      },
      { message: 'KDV başarıyla güncellendi' }
    )
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

