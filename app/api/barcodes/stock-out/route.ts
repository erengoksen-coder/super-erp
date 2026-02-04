import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

// POST: Barkod okutarak stok düş
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { barcode, customer_id } = body

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barkod gerekli' },
        { status: 400 }
      )
    }

    if (!customer_id) {
      return NextResponse.json(
        { error: 'Müşteri seçimi zorunludur' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Barkod bilgisini al
    const barcodeData = db.prepare(`
      SELECT 
        psn.*,
        p.name as product_name,
        p.sku,
        p.stock_amount
      FROM product_serial_numbers psn
      JOIN active_products p ON psn.product_id = p.id
      WHERE psn.barcode = ? OR psn.serial_number = ?
    `).get(barcode, barcode) as any

    if (!barcodeData) {
      return NextResponse.json(
        { error: 'Barkod bulunamadı' },
        { status: 404 }
      )
    }

    // Eşer zaten satıldıysa
    if (barcodeData.status === 'sold') {
      return NextResponse.json(
        { error: 'Bu ürün zaten satılmış' },
        { status: 400 }
      )
    }

    // Müşteriyi kontrol et (cari hesaplarda olmalı)
    const customer = db.prepare(`
      SELECT id, name, type FROM accounts 
      WHERE id = ? AND type = 'customer'
    `).get(customer_id) as any

    if (!customer) {
      return NextResponse.json(
        { error: 'Seçilen müşteri cari hesaplarda bulunamadı' },
        { status: 400 }
      )
    }

    // Barkod durumunu güncelle (müşteri bilgisi ile)
    db.prepare(`
      UPDATE product_serial_numbers
      SET status = 'sold', sold_at = CURRENT_TIMESTAMP, customer_id = ?
      WHERE id = ?
    `).run(customer_id, barcodeData.id)

    // �Srün stokunu düş (eşer stok takibi yapılıyorsa)
    if (barcodeData.stock_amount > 0) {
      const newStock = barcodeData.stock_amount - 1
      db.prepare(`
        UPDATE products
        SET stock_amount = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStock, barcodeData.product_id)
    }

    return NextResponse.json({
      success: true,
      message: 'Stok başarıyla düşürüldü',
      barcode: barcodeData.barcode,
      product_name: barcodeData.product_name,
      new_stock: barcodeData.stock_amount > 0 ? barcodeData.stock_amount - 1 : 0,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})


