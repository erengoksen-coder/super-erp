import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { resolveUnitFactor } from '@/lib/units'

// GET: Bir ürünün BOM'dan toplam maliyetini hesapla
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    if (!productId) {
      return NextResponse.json({ error: 'product_id gerekli' }, { status: 400 })
    }

    const db = getDatabase()

    // Ürünün BOM kayıtlarını ve malzeme birim fiyatlarını al
    const bomItems = db.prepare(`
      SELECT 
        b.quantity_required as quantity,
        b.unit as unit,
        b.fire_percentage,
        m.unit_price,
        m.unit as material_unit,
        m.id as material_id
      FROM bom b
      JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
      JOIN materials m ON b.material_id = m.id
      WHERE b.product_id = ? AND b.deleted_at IS NULL
    `).all(productId) as any[]

    // Toplam maliyeti hesapla
    let totalCost = 0
    const itemCosts = bomItems.map((item: any) => {
      const quantityWithFire = item.quantity * (1 + (item.fire_percentage || 0) / 100)
      const fromUnit = (item.unit || item.material_unit || '').toString()
      const toUnit = (item.material_unit || '').toString()
      const factor = resolveUnitFactor(db, item.material_id || null, fromUnit, toUnit)
      const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire
      const unitPrice = item.unit_price || 0
      const itemCost = convertedQuantity * unitPrice
      totalCost += itemCost
      return {
        quantity: item.quantity,
        fire_percentage: item.fire_percentage || 0,
        quantity_with_fire: quantityWithFire,
        unit: item.unit || item.material_unit || null,
        material_unit: item.material_unit || null,
        conversion_factor: factor,
        unit_price: unitPrice,
        cost: itemCost,
      }
    })

    return NextResponse.json({
      product_id: productId,
      total_cost: totalCost,
      item_costs: itemCosts,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})


