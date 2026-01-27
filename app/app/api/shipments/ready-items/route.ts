import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Müşteriye ait sevk edilebilir ürünleri getir (customer_id yoksa tümünü getir)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')

    const db = getDatabase()

    let readyItems: any[]
    
    if (customerId) {
      // Belirli bir müşteri için
      readyItems = db.prepare(`
        SELECT 
          psn.*,
          p.name as product_name,
          p.sku as product_sku,
          po.order_number as production_order_number,
          a.name as customer_name,
          a.code as customer_code
        FROM product_serial_numbers psn
        JOIN products p ON psn.product_id = p.id
        LEFT JOIN production_orders po ON psn.production_order_id = po.id
        LEFT JOIN accounts a ON psn.customer_id = a.id
        WHERE psn.ready_for_shipment = 1
          AND psn.status = 'in_stock'
          AND (psn.customer_id = ? OR psn.customer_id IS NULL)
          AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
        ORDER BY psn.customer_id = ? DESC, p.sku ASC, psn.created_at ASC
      `).all(customerId, customerId)
    } else {
      // Tüm müşteriler için (müşteriye göre grupla)
      readyItems = db.prepare(`
        SELECT 
          psn.*,
          p.name as product_name,
          p.sku as product_sku,
          po.order_number as production_order_number,
          a.name as customer_name,
          a.code as customer_code
        FROM product_serial_numbers psn
        JOIN products p ON psn.product_id = p.id
        LEFT JOIN production_orders po ON psn.production_order_id = po.id
        LEFT JOIN accounts a ON psn.customer_id = a.id
        WHERE psn.ready_for_shipment = 1
          AND psn.status = 'in_stock'
          AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
        ORDER BY COALESCE(psn.customer_id, 'no-customer'), p.sku ASC, psn.created_at ASC
      `).all()
    }

    if (customerId) {
      // Belirli müşteri için - ürün bazlı grupla
      const groupedByProduct = readyItems.reduce((acc: any, item: any) => {
        const key = item.product_id
        if (!acc[key]) {
          acc[key] = {
            product_id: item.product_id,
            product_name: item.product_name,
            product_sku: item.product_sku,
            total_count: 0,
            items: [],
          }
        }
        acc[key].total_count++
        acc[key].items.push({
          id: item.id,
          barcode: item.barcode,
          serial_number: item.serial_number,
          production_order_number: item.production_order_number,
        })
        return acc
      }, {})

      return NextResponse.json({
        items: Object.values(groupedByProduct),
        total_items: readyItems.length,
      })
    } else {
      // Tüm müşteriler için - ham veriyi döndür (frontend'de grupla)
      return NextResponse.json({
        items: readyItems,
        total_items: readyItems.length,
      })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Ürünü sevk edilebilir olarak işaretle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { barcode, customer_id, ready } = body

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

    // updated_at kolonu varsa güncelle, yoksa sadece diğer alanları güncelle
    try {
      db.prepare(`
        UPDATE product_serial_numbers
        SET ready_for_shipment = ?,
            customer_id = COALESCE(?, customer_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(readyValue, customerIdValue, product.id)
    } catch (e: any) {
      // updated_at kolonu yoksa, sadece diğer alanları güncelle
      if (e.message?.includes('no such column: updated_at')) {
        db.prepare(`
          UPDATE product_serial_numbers
          SET ready_for_shipment = ?,
              customer_id = COALESCE(?, customer_id)
          WHERE id = ?
        `).run(readyValue, customerIdValue, product.id)
      } else {
        throw e
      }
    }

    return NextResponse.json({
      success: true,
      message: ready ? 'Ürün sevk edilebilir olarak işaretlendi' : 'İşaret kaldırıldı',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

