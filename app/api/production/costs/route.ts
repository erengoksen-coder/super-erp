import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Üretim maliyet kayıtları
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('production_order_id')
    const db = getDatabase()

    let query = `
      SELECT pc.*, po.order_number, p.name as product_name, p.sku as product_sku
      FROM production_costs pc
      JOIN production_orders po ON pc.production_order_id = po.id
      JOIN products p ON po.product_id = p.id
      WHERE pc.deleted_at IS NULL
    `
    const params: string[] = []

    if (orderId) {
      query += ' AND pc.production_order_id = ?'
      params.push(orderId)
    }

    query += ' ORDER BY pc.created_at DESC'
    const rows = db.prepare(query).all(...params)
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
