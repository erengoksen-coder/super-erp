import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { DEPODA_STATUSES } from '@/lib/barcodeStatus'

// GET: Mamül depodaki ürünleri sipariş kartları ve barkod detaylarıyla getir
// Sadece status = in_stock veya available olanlar (Barkod listesi / Genel Durum ile aynı tanım)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = getDatabase()
    const statusList = DEPODA_STATUSES.map(() => '?').join(', ')
    
    const warehouseItems = db.prepare(`
      SELECT 
        psn.id as barcode_id,
        psn.barcode,
        psn.serial_number,
        psn.shipment_id,
        psn.status as barcode_status,
        psn.created_at as barcode_created_at,
        p.id as product_id,
        p.name as product_name,
        p.sku as product_sku,
        po.id as production_order_id,
        po.order_number as production_order_number,
        po.quantity as production_order_quantity,
        po.created_at as production_order_created_at,
        po.completed_at as production_order_completed_at,
        o.id as order_id,
        o.order_number as customer_order_number,
        o.dealer_name,
        o.customer_name,
        o.order_date,
        o.configuration,
        o.notes as order_notes,
        a.id as customer_id,
        a.code as customer_code,
        a.name as customer_account_name,
        a.email as customer_email,
        a.phone as customer_phone
      FROM product_serial_numbers psn
      JOIN products p ON psn.product_id = p.id AND p.deleted_at IS NULL
      LEFT JOIN production_orders po ON psn.production_order_id = po.id
      LEFT JOIN active_orders o ON po.id = o.production_order_id
      LEFT JOIN accounts a ON psn.customer_id = a.id
      WHERE psn.status IN (${statusList})
        AND p.id IS NOT NULL
      ORDER BY (CASE WHEN (psn.shipment_id IS NULL OR psn.shipment_id = '') THEN 0 ELSE 1 END), po.completed_at DESC, psn.created_at DESC
    `).all(...DEPODA_STATUSES) as any[]
    
    console.log(`[Warehouse API] Found ${warehouseItems.length} items in warehouse`)
    
    return NextResponse.json(warehouseItems)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// DELETE: Mamül depodaki tek bir ürünü (barkod kaydını) sil
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const barcodeId = searchParams.get('barcode_id') // product_serial_numbers.id
    const barcode = searchParams.get('barcode')

    if (!barcodeId && !barcode) {
      return NextResponse.json(
        { error: 'barcode_id veya barcode parametresi gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    const row = barcodeId
      ? (db.prepare(`
          SELECT id, product_id, status, shipment_id
          FROM product_serial_numbers
          WHERE id = ?
        `).get(barcodeId) as { id: string; product_id: string; status: string | null; shipment_id: string | null } | undefined)
      : (db.prepare(`
          SELECT id, product_id, status, shipment_id
          FROM product_serial_numbers
          WHERE barcode = ? OR serial_number = ?
        `).get(barcode, barcode) as { id: string; product_id: string; status: string | null; shipment_id: string | null } | undefined)

    if (!row) {
      return NextResponse.json({ error: 'Mamül depoda bu barkod bulunamadı' }, { status: 404 })
    }

    if (row.shipment_id && row.shipment_id.trim() !== '') {
      return NextResponse.json(
        { error: 'Bu ürün zaten sevk edilmiş, silinemez' },
        { status: 400 }
      )
    }

    const statusOk = ['in_stock', 'available', ''].includes((row.status || '').trim()) || !row.status
    if (!statusOk) {
      return NextResponse.json(
        { error: 'Sadece mamül depodaki (depoda/sevke hazır) ürünler silinebilir' },
        { status: 400 }
      )
    }

    db.transaction(() => {
      db.prepare('DELETE FROM product_serial_numbers WHERE id = ?').run(row.id)
      try {
        db.prepare(`
          UPDATE products
          SET stock_amount = MAX(0, COALESCE(stock_amount, 0) - 1),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(row.product_id)
      } catch (e: any) {
        if (e?.message?.includes('no such column: updated_at')) {
          db.prepare(`
            UPDATE products
            SET stock_amount = MAX(0, COALESCE(stock_amount, 0) - 1)
            WHERE id = ?
          `).run(row.product_id)
        } else throw e
      }
    })()

    return NextResponse.json({ success: true, message: 'Mamül depodan ürün silindi' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
