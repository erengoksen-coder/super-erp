import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// GET: Üretim emri için fiili harcanan malzemeleri getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productionOrderId = searchParams.get('production_order_id')

    if (!productionOrderId) {
      return NextResponse.json({ error: 'production_order_id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const consumptions = db.prepare(`
      SELECT 
        pac.*,
        m.name as material_name,
        m.unit,
        m.purchase_price
      FROM production_actual_consumption pac
      JOIN materials m ON pac.material_id = m.id
      WHERE pac.production_order_id = ?
      ORDER BY m.name
    `).all(productionOrderId)

    return NextResponse.json(consumptions)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Fiili harcanan miktarı kaydet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { production_order_id, material_id, actual_quantity } = body

    if (!production_order_id || !material_id || actual_quantity === undefined) {
      return NextResponse.json(
        { error: 'production_order_id, material_id ve actual_quantity gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Planlanan miktarı al
    const consumption = db.prepare(`
      SELECT planned_quantity FROM production_actual_consumption
      WHERE production_order_id = ? AND material_id = ?
    `).get(production_order_id, material_id) as any

    if (!consumption) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })
    }

    const plannedQuantity = consumption.planned_quantity
    
    // BOM'dan fire yüzdesini al
    const bomData = db.prepare(`
      SELECT b.fire_percentage
      FROM production_orders po
      JOIN bom b ON po.product_id = b.product_id
      WHERE po.id = ? AND b.material_id = ?
    `).get(production_order_id, material_id) as any
    
    const firePercentage = bomData?.fire_percentage || 0
    // Planlanan miktar zaten fire dahil, base quantity'yi hesapla
    const baseQuantity = plannedQuantity / (1 + firePercentage / 100)
    // Fiili fire = Fiili harcanan - Base miktar
    const fireQuantity = actual_quantity - baseQuantity
    
    const variance = actual_quantity - plannedQuantity
    const variancePercentage = plannedQuantity > 0 
      ? (variance / plannedQuantity) * 100 
      : 0

    // Güncelle
    db.prepare(`
      UPDATE production_actual_consumption
      SET actual_quantity = ?,
          fire_quantity = ?,
          variance = ?,
          variance_percentage = ?,
          recorded_at = CURRENT_TIMESTAMP
      WHERE production_order_id = ? AND material_id = ?
    `).run(
      actual_quantity,
      fireQuantity,
      variance,
      variancePercentage,
      production_order_id,
      material_id
    )

    return NextResponse.json({ 
      success: true, 
      message: 'Fiili harcanan miktar kaydedildi',
      variance,
      variancePercentage: variancePercentage.toFixed(2)
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

