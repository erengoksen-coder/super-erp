import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Fire analizi raporu
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start') || new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0]

    const db = getDatabase()

    // Fiili harcanan malzemeleri analiz et
    const analysis = db.prepare(`
      SELECT 
        pac.material_id,
        m.name as material_name,
        m.unit,
        m.purchase_price,
        SUM(pac.planned_quantity) as total_planned,
        SUM(COALESCE(pac.actual_quantity, pac.planned_quantity)) as total_actual,
        SUM(COALESCE(pac.fire_quantity, 0)) as total_fire,
        SUM(COALESCE(pac.actual_quantity, pac.planned_quantity) - pac.planned_quantity) as total_variance,
        AVG(COALESCE(pac.variance_percentage, 0)) as variance_percentage,
        SUM((COALESCE(pac.actual_quantity, pac.planned_quantity) - pac.planned_quantity) * m.purchase_price) as total_cost_variance,
        COUNT(DISTINCT pac.production_order_id) as order_count
      FROM production_actual_consumption pac
      JOIN materials m ON pac.material_id = m.id
      JOIN production_orders po ON pac.production_order_id = po.id
      WHERE date(po.created_at) >= date(?) AND date(po.created_at) <= date(?)
      GROUP BY pac.material_id, m.name, m.unit, m.purchase_price
      ORDER BY total_variance DESC
    `).all(startDate, endDate)

    return NextResponse.json(analysis)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


