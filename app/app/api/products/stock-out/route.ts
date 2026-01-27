import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// POST: Mamül stok çıkışı
export async function POST(request: NextRequest) {
  try {
      const body = await request.json()
      const { product_id, quantity, customer_id, notes } = body

      if (!product_id || quantity === undefined || quantity <= 0) {
        return NextResponse.json(
          { error: 'product_id ve quantity (pozitif) gerekli' },
          { status: 400 }
        )
      }

      if (!customer_id) {
        return NextResponse.json(
          { error: 'Müşteri seçimi zorunludur. Lütfen bir müşteri seçin.' },
          { status: 400 }
        )
      }

    const db = getDatabase()

    // Ürün bilgisini al
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id) as any
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 })
    }

    // Müşteri bilgisini al (transaction'dan önce)
    const customer = db.prepare('SELECT * FROM accounts WHERE id = ?').get(customer_id) as any
    if (!customer) {
      return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 })
    }

    // Yeni stok miktarını hesapla
    const newStock = product.stock_amount - quantity

    if (newStock < 0) {
      return NextResponse.json(
        { error: 'Stok miktarı negatif olamaz. Mevcut stok: ' + product.stock_amount },
        { status: 400 }
      )
    }

    db.transaction(() => {
      // Stoku güncelle
      db.prepare(`
        UPDATE products
        SET stock_amount = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStock, product_id)

      // Stok hareketi kaydı oluştur (product_id kullan, material_id NULL)
      const movementId = randomUUID()
      db.prepare(`
        INSERT INTO stock_movements 
        (id, material_id, product_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
        VALUES (?, NULL, ?, 'out', ?, 'manual', NULL, ?, CURRENT_TIMESTAMP)
      `).run(
        movementId,
        product_id,
        quantity,
        notes || `Manuel mamül stok çıkışı - Müşteri: ${customer.name} - ${new Date().toLocaleString('tr-TR')}`
      )
    })()

    // Çıkan ürünlerin barkodlarını sevk edilebilir olarak işaretle
    // En eski barkodlardan başlayarak quantity kadarını işaretle
    const availableBarcodes = db.prepare(`
      SELECT id, barcode 
      FROM product_serial_numbers 
      WHERE product_id = ? 
        AND status = 'in_stock'
        AND ready_for_shipment = 0
        AND (shipment_id IS NULL OR shipment_id = '')
      ORDER BY created_at ASC
      LIMIT ?
    `).all(product_id, quantity) as any[]

    if (availableBarcodes.length > 0) {
      const barcodeIds = availableBarcodes.map(b => b.id)
      const placeholders = barcodeIds.map(() => '?').join(',')
      
      // updated_at kolonu varsa güncelle, yoksa sadece diğer alanları güncelle
      try {
        db.prepare(`
          UPDATE product_serial_numbers
          SET ready_for_shipment = 1,
              customer_id = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id IN (${placeholders})
        `).run(customer_id, ...barcodeIds)
      } catch (e: any) {
        // updated_at kolonu yoksa, sadece diğer alanları güncelle
        if (e.message?.includes('no such column: updated_at')) {
          db.prepare(`
            UPDATE product_serial_numbers
            SET ready_for_shipment = 1,
                customer_id = ?
            WHERE id IN (${placeholders})
          `).run(customer_id, ...barcodeIds)
        } else {
          throw e
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Stok çıkışı yapıldı',
      new_stock: newStock,
      product: {
        ...product,
        stock_amount: newStock,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

