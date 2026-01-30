import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// GET: Üretim emri için fiili harcanan malzemeleri getir
export const GET = withAuth(async (request: NextRequest) => {
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
})

// POST: Fiili harcanan miktarı kaydet
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { production_order_id, material_id, actual_quantity, actual_usage, scrap_reason } = body

    const resolvedActual = actual_usage !== undefined ? actual_usage : actual_quantity

    if (!production_order_id || !material_id || resolvedActual === undefined) {
      return NextResponse.json(
        { error: 'production_order_id, material_id ve actual_usage gerekli' },
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
      SELECT COALESCE(b.waste_percentage, b.fire_percentage, 0) as waste_percentage
      FROM production_orders po
      JOIN bom b ON po.product_id = b.product_id
      JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
      WHERE po.id = ? AND b.material_id = ? AND b.deleted_at IS NULL
    `).get(production_order_id, material_id) as any
    
    const firePercentage = bomData?.waste_percentage || 0
    // Planlanan miktar zaten fire dahil, base quantity'yi hesapla
    const baseQuantity = plannedQuantity / (1 + firePercentage / 100)
    // Fiili fire = Fiili harcanan - Base miktar
    const fireQuantity = resolvedActual - baseQuantity
    
    const variance = resolvedActual - plannedQuantity
    const variancePercentage = plannedQuantity > 0 
      ? (variance / plannedQuantity) * 100 
      : 0

    // Güncelle
    db.prepare(`
      UPDATE production_actual_consumption
      SET actual_quantity = ?,
          actual_usage = ?,
          fire_quantity = ?,
          variance = ?,
          variance_percentage = ?,
          scrap_reason = ?,
          recorded_at = CURRENT_TIMESTAMP
      WHERE production_order_id = ? AND material_id = ?
    `).run(
      resolvedActual,
      resolvedActual,
      fireQuantity,
      variance,
      variancePercentage,
      scrap_reason || null,
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
})

