import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

// GET: Mamül depodaki ürünleri sipariş kartları ve barkod detaylarıyla getir
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = getDatabase()
    
    // Mamül depodaki ürünleri getir (completed durumundaki)
    // Sadece products tablosundan gelen kayıtları göster (hammaddeler değil)
    // Her barkod için sipariş ve müşteri bilgileriyle birlikte
    const warehouseItems = db.prepare(`
      SELECT 
        psn.id as barcode_id,
        psn.barcode,
        psn.serial_number,
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
      WHERE psn.current_station = 'completed'
        AND p.id IS NOT NULL
        AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
      ORDER BY po.completed_at DESC, psn.created_at DESC
    `).all() as any[]
    
    console.log(`[Warehouse API] Found ${warehouseItems.length} items in warehouse`)
    
    return NextResponse.json(warehouseItems)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
