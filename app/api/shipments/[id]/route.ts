import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Tek sevkiyat detayı
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const db = getDatabase()
    const resolvedParams = await Promise.resolve(params)
    const shipmentId = resolvedParams.id

    const shipment = db.prepare(`
      SELECT 
        s.*,
        a.name as customer_name,
        a.code as customer_code,
        a.address as customer_address,
        a.phone as customer_phone,
        a.email as customer_email
      FROM shipments s
      JOIN accounts a ON s.customer_id = a.id
      WHERE s.id = ?
    `).get(shipmentId) as any

    if (!shipment) {
      return NextResponse.json({ error: 'Sevkiyat bulunamadı' }, { status: 404 })
    }

    const items = db.prepare(`
      SELECT 
        si.*,
        p.name as product_name,
        p.sku as product_sku
      FROM shipment_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.shipment_id = ?
      ORDER BY p.sku
    `).all(shipmentId)

    // Serial numbers'ı parse et
    const itemsWithParsedSerials = items.map((item: any) => {
      let parsedSerials = null
      if (item.serial_numbers) {
        try {
          parsedSerials = JSON.parse(item.serial_numbers)
        } catch (e) {
          // JSON parse hatası durumunda null olarak bırak
          parsedSerials = null
        }
      }
      return {
        ...item,
        serial_numbers: parsedSerials,
      }
    })

    return NextResponse.json({
      ...shipment,
      items: itemsWithParsedSerials,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Sevkiyatı geri al (iptal et)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const db = getDatabase()
    const resolvedParams = await Promise.resolve(params)
    const shipmentId = resolvedParams.id
    const { randomUUID } = await import('crypto')

    // Sevkiyat bilgilerini al
    const shipment = db.prepare(`
      SELECT * FROM shipments WHERE id = ?
    `).get(shipmentId) as any

    if (!shipment) {
      return NextResponse.json({ error: 'Sevkiyat bulunamadı' }, { status: 404 })
    }

    // Zaten iptal edilmiş mi kontrol et
    if (shipment.status === 'cancelled') {
      return NextResponse.json({ error: 'Bu sevkiyat zaten iptal edilmiş' }, { status: 400 })
    }

    // Sevkiyat kalemlerini al
    const items = db.prepare(`
      SELECT 
        si.*,
        p.name as product_name
      FROM shipment_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.shipment_id = ?
    `).all(shipmentId) as any[]

    db.transaction(() => {
      // Her kalem için işlemleri geri al
      for (const item of items) {
        // Barkodları geri al (ready_for_shipment = 1, shipment_id = NULL)
        if (item.serial_numbers) {
          try {
            const barcodes = JSON.parse(item.serial_numbers) as string[]
            if (barcodes.length > 0) {
              const placeholders = barcodes.map(() => '?').join(',')
              db.prepare(`
                UPDATE product_serial_numbers
                SET shipment_id = NULL,
                    status = 'in_stock',
                    ready_for_shipment = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE barcode IN (${placeholders})
                  AND product_id = ?
              `).run(...barcodes, item.product_id)
            }
          } catch (e) {
            // JSON parse hatası, devam et
          }
        }

        // Ürün stok miktarını geri ekle
        db.prepare(`
          UPDATE products
          SET stock_amount = stock_amount + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(item.quantity, item.product_id)

        // Cari hesap işlemlerini iptal et (ters kayıt ekle)
        const transactionId = randomUUID()
        db.prepare(`
          INSERT INTO account_transactions 
          (id, account_id, transaction_type, amount, reference_type, reference_id, description, created_at)
          VALUES (?, ?, 'credit', ?, 'shipment_return', ?, ?, CURRENT_TIMESTAMP)
        `).run(
          transactionId,
          shipment.customer_id,
          item.total_price || 0,
          item.id,
          `Sevkiyat İptali: ${shipment.shipment_number} - ${item.product_name} (${item.quantity} adet) - İade: ${(item.total_price || 0).toFixed(2)} ₺`
        )
      }

      // Cari hesap bakiyesini düşür (borç azalt)
      db.prepare(`
        UPDATE accounts
        SET balance = balance - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(shipment.final_amount || shipment.total_amount || 0, shipment.customer_id)

      // Sevkiyat durumunu iptal olarak işaretle
      db.prepare(`
        UPDATE shipments
        SET status = 'cancelled',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(shipmentId)
    })()

    return NextResponse.json({
      success: true,
      message: 'Sevkiyat başarıyla iptal edildi ve ürünler stoka geri eklendi'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
