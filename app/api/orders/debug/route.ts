import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Debug endpoint - Sipariş durumunu kontrol et
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')
    
    if (!orderId) {
      return NextResponse.json({ error: 'order_id gerekli' }, { status: 400 })
    }
    
    const db = getDatabase()
    
    // Sipariş bilgisini al
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any
    
    if (!order) {
      return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
    }
    
    // Production order bilgisini al
    let productionOrder = null
    if (order.production_order_id) {
      productionOrder = db.prepare('SELECT * FROM production_orders WHERE id = ?').get(order.production_order_id) as any
    }
    
    // Pending sorgusunda görünüyor mu kontrol et
    const pendingQuery = `
      SELECT COUNT(*) as count
      FROM orders
      WHERE status = 'pending'
        AND (production_order_id IS NULL OR production_order_id = '' OR TRIM(COALESCE(production_order_id, '')) = '')
        AND id = ?
    `
    const pendingCheck = db.prepare(pendingQuery).get(orderId) as any
    
    return NextResponse.json({
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        production_order_id: order.production_order_id,
        production_order_id_type: typeof order.production_order_id,
        production_order_id_length: order.production_order_id ? String(order.production_order_id).length : 0,
        production_order_id_trimmed: order.production_order_id ? String(order.production_order_id).trim() : null
      },
      production_order: productionOrder ? {
        id: productionOrder.id,
        order_number: productionOrder.order_number,
        status: productionOrder.status
      } : null,
      pending_query_result: {
        count: pendingCheck?.count || 0,
        visible_in_pending: (pendingCheck?.count || 0) > 0
      },
      analysis: {
        has_production_order_id: order.production_order_id !== null && 
                                 order.production_order_id !== undefined &&
                                 String(order.production_order_id).trim() !== '' &&
                                 String(order.production_order_id).trim() !== 'null',
        should_be_filtered: order.production_order_id !== null && 
                          order.production_order_id !== undefined &&
                          String(order.production_order_id).trim() !== '' &&
                          String(order.production_order_id).trim() !== 'null' &&
                          order.status === 'pending'
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

