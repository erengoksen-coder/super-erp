import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Bir ürünün BOM'dan toplam maliyetini hesapla
export async function GET(request: NextRequest) {
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
        b.fire_percentage,
        m.unit_price
      FROM bom b
      JOIN materials m ON b.material_id = m.id
      WHERE b.product_id = ?
    `).all(productId) as any[]

    // Toplam maliyeti hesapla
    let totalCost = 0
    const itemCosts = bomItems.map((item: any) => {
      const quantityWithFire = item.quantity * (1 + (item.fire_percentage || 0) / 100)
      const unitPrice = item.unit_price || 0
      const itemCost = quantityWithFire * unitPrice
      totalCost += itemCost
      return {
        quantity: item.quantity,
        fire_percentage: item.fire_percentage || 0,
        quantity_with_fire: quantityWithFire,
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
}


