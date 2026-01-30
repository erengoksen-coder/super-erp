import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

type ShipmentRow = {
  id: string
  status: string
  customer_id: string
  total_amount?: number | null
  final_amount?: number | null
  invoice_id?: string | null
  invoice_number?: string | null
}

type ShipmentItemRow = {
  id: string
  product_id: string
  quantity: number
  serial_numbers: string | null
  product_sku?: string | null
}

type ShipmentStatusInput = {
  status?: 'pending' | 'in_transit' | 'delivered' | 'cancelled'
  cancel_reason?: string
}

// PATCH: Sevkiyat durumunu güncelle
export const PATCH = withAuth(async (
  request: NextRequest, user,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) => {
  try {
    const resolvedParams = await Promise.resolve(params)
    const shipmentId = resolvedParams.id
    const body = await request.json() as ShipmentStatusInput
    const { status, cancel_reason } = body

    if (!status || !['pending', 'in_transit', 'delivered', 'cancelled'].includes(status)) {
      return fail('Geçersiz durum. Geçerli durumlar: pending, in_transit, delivered, cancelled', { status: 400 })
    }

    // İptal ediliyorsa iptal nedeni zorunlu
    if (status === 'cancelled' && (!cancel_reason || !cancel_reason.trim())) {
      return fail('İptal nedeni zorunludur', { status: 400 })
    }

    const db = getDatabase()

    // Sevkiyatı bul
    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(shipmentId) as ShipmentRow | undefined
    if (!shipment) {
      return fail('Sevkiyat bulunamadı', { status: 404 })
    }

    const oldStatus = shipment.status
    const newStatus = status

    db.transaction(() => {
      // Eğer iptal ediliyorsa
      if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
        // 1. Müşteri cari hesabından düş (borç azalt)
        const finalAmount = shipment.final_amount || shipment.total_amount || 0
        db.prepare(`
          UPDATE accounts
          SET balance = balance - ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(finalAmount, shipment.customer_id)

        // 2. Ürünleri tekrar stoka ekle
        const shipmentItems = db.prepare(`
          SELECT si.*, p.sku as product_sku
          FROM shipment_items si
          JOIN active_products p ON si.product_id = p.id
          WHERE si.shipment_id = ?
        `).all(shipmentId) as ShipmentItemRow[]

        for (const item of shipmentItems) {
          // Ürün stokunu artır
          db.prepare(`
            UPDATE products
            SET stock_amount = stock_amount + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(item.quantity, item.product_id)

          // Barkodları tekrar stoka al
          if (item.serial_numbers) {
            try {
              const barcodes = JSON.parse(item.serial_numbers)
              if (Array.isArray(barcodes) && barcodes.length > 0) {
                const placeholders = barcodes.map(() => '?').join(',')
                try {
                  db.prepare(`
                    UPDATE product_serial_numbers
                    SET status = 'in_stock',
                        ready_for_shipment = 0,
                        shipment_id = NULL,
                        customer_id = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE barcode IN (${placeholders})
                  `).run(...barcodes)
                } catch (e: any) {
                  // updated_at kolonu yoksa, sadece diğer alanları güncelle
                  if (e.message?.includes('no such column: updated_at')) {
                    db.prepare(`
                      UPDATE product_serial_numbers
                      SET status = 'in_stock',
                          ready_for_shipment = 0,
                          shipment_id = NULL,
                          customer_id = NULL
                      WHERE barcode IN (${placeholders})
                    `).run(...barcodes)
                  } else {
                    throw e
                  }
                }
              }
            } catch (e) {
              // JSON parse hatası durumunda sessizce devam et
              console.warn('Serial numbers parse hatası:', e)
            }
          }
        }

        // 3. Eğer sevkiyatın faturası varsa iptal et (soft delete)
        const invoiceId = shipment.invoice_id
        if (invoiceId) {
          db.prepare(`
            UPDATE invoices
            SET status = 'cancelled',
                deleted_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(invoiceId)

          db.prepare(`
            UPDATE invoice_items
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE invoice_id = ?
          `).run(invoiceId)

          db.prepare(`
            UPDATE shipments
            SET invoice_id = NULL,
                invoice_number = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(shipmentId)
        }
      }

      // Eğer iptalden başka duruma geçiliyorsa (örneğin delivered)
      if (oldStatus === 'cancelled' && newStatus !== 'cancelled') {
        // İptal işlemini geri al
        const finalAmount = shipment.final_amount || shipment.total_amount || 0
        
        // Müşteri cari hesabına tekrar ekle
        db.prepare(`
          UPDATE accounts
          SET balance = balance + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(finalAmount, shipment.customer_id)

        // Ürünleri tekrar stoktan çıkar
        const shipmentItems = db.prepare(`
          SELECT si.*
          FROM shipment_items si
          WHERE si.shipment_id = ?
        `).all(shipmentId) as ShipmentItemRow[]

        for (const item of shipmentItems) {
          // Ürün stokunu azalt
          db.prepare(`
            UPDATE products
            SET stock_amount = stock_amount - ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(item.quantity, item.product_id)

          // Barkodları tekrar sevkiyata bağla
          if (item.serial_numbers) {
            try {
              const barcodes = JSON.parse(item.serial_numbers)
              if (Array.isArray(barcodes) && barcodes.length > 0) {
                const placeholders = barcodes.map(() => '?').join(',')
                try {
                  db.prepare(`
                    UPDATE product_serial_numbers
                    SET status = 'shipped',
                        ready_for_shipment = 0,
                        shipment_id = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE barcode IN (${placeholders})
                  `).run(shipmentId, ...barcodes)
                } catch (e: any) {
                  // updated_at kolonu yoksa, sadece diğer alanları güncelle
                  if (e.message?.includes('no such column: updated_at')) {
                    db.prepare(`
                      UPDATE product_serial_numbers
                      SET status = 'shipped',
                          ready_for_shipment = 0,
                          shipment_id = ?
                      WHERE barcode IN (${placeholders})
                    `).run(shipmentId, ...barcodes)
                  } else {
                    throw e
                  }
                }
              }
            } catch (e) {
              console.warn('Serial numbers parse hatası:', e)
            }
          }
        }
      }

      // Durumu güncelle
      // cancel_reason kolonunu eklemeyi dene (yoksa) - db.ts'de de eklenir ama burada da denemek güvenli
      try {
        db.exec('ALTER TABLE shipments ADD COLUMN cancel_reason TEXT')
      } catch (e: any) {
        // Kolon zaten varsa hata verir, sessizce devam et
      }
      
      // Durumu ve iptal nedenini güncelle
      try {
        if (newStatus === 'cancelled') {
          db.prepare(`
            UPDATE shipments
            SET status = ?,
                cancel_reason = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(newStatus, cancel_reason?.trim() || null, shipmentId)
        } else {
          db.prepare(`
            UPDATE shipments
            SET status = ?,
                cancel_reason = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(newStatus, shipmentId)
        }
      } catch (e: any) {
        // cancel_reason kolonu yoksa sadece status güncelle (fallback)
        if (e.message?.includes('no such column: cancel_reason')) {
          db.prepare(`
            UPDATE shipments
            SET status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(newStatus, shipmentId)
        } else {
          throw e
        }
      }
    })()

    return ok(
      {
        shipment: {
          ...shipment,
          status: newStatus,
        },
      },
      { message: 'Sevkiyat durumu güncellendi' }
    )
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

