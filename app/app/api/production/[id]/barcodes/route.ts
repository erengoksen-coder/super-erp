import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Üretim emrine ait barkodları getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDatabase()
    const productionOrderId = params.id

    const barcodes = db.prepare(`
      SELECT 
        psn.*,
        p.name as product_name,
        p.sku as product_sku
      FROM product_serial_numbers psn
      JOIN products p ON psn.product_id = p.id
      WHERE psn.production_order_id = ?
      ORDER BY psn.created_at DESC
    `).all(productionOrderId)

    return NextResponse.json(barcodes)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Barkodu sevk edilebilir olarak işaretle/kaldır
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { barcode, ready, customer_id } = body

    if (!barcode) {
      return NextResponse.json({ error: 'barcode gerekli' }, { status: 400 })
    }

    const db = getDatabase()

    // Barkod ile ürünü bul
    const product = db.prepare(`
      SELECT * FROM product_serial_numbers 
      WHERE barcode = ? OR serial_number = ?
    `).get(barcode, barcode) as any

    if (!product) {
      return NextResponse.json({ error: 'Barkod bulunamadı' }, { status: 404 })
    }

    // Sevk edilebilir durumunu güncelle
    const readyValue = ready ? 1 : 0
    const customerIdValue = ready && customer_id ? customer_id : null

    db.prepare(`
      UPDATE product_serial_numbers
      SET ready_for_shipment = ?,
          customer_id = COALESCE(?, customer_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(readyValue, customerIdValue, product.id)

    return NextResponse.json({
      success: true,
      message: ready ? 'Ürün sevk edilebilir olarak işaretlendi' : 'İşaret kaldırıldı',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

