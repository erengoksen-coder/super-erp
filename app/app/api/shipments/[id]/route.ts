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

