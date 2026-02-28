import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

type ProductSerialRow = {
  id: string
  product_id: string
  production_order_id: string
  serial_number: string
  barcode: string
  status: string | null
  created_at: string
  product_name?: string
  product_sku?: string
  shipment_id?: string | null
}

// GET: Üretim emrine ait barkodları getir
export const GET = withAuth(async (
  request: NextRequest,
  _user,
  context?: { params?: { id?: string } | Promise<{ id?: string }> }
) => {
  try {
    const db = getDatabase()
    const resolvedParams = await Promise.resolve(context?.params)
    const productionOrderId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).slice(-2)[0]
    if (!productionOrderId) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }

    const barcodes = db.prepare(`
      SELECT 
        psn.*,
        p.name as product_name,
        p.sku as product_sku,
        psn.shipment_id
      FROM product_serial_numbers psn
      JOIN active_products p ON psn.product_id = p.id
      WHERE psn.production_order_id = ?
      ORDER BY psn.created_at DESC
    `).all(productionOrderId) as ProductSerialRow[]

    return NextResponse.json(barcodes)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
});

// POST: Barkodu sevk edilebilir olarak işaretle/kaldır
export const POST = withAuth(async (
  request: NextRequest,
  _user,
  _context?: { params?: { id?: string } | Promise<{ id?: string }> }
) => {
  try {
    const body = await parseJsonBody(request)
    const { barcode, ready, customer_id } = body

    if (!barcode) {
      return NextResponse.json({ error: 'barcode gerekli' }, { status: 400 })
    }

    const db = getDatabase()

    // Barkod ile ürünü bul
    const product = db.prepare(`
      SELECT * FROM product_serial_numbers 
      WHERE barcode = ? OR serial_number = ?
    `).get(barcode, barcode) as ProductSerialRow | undefined

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
});


