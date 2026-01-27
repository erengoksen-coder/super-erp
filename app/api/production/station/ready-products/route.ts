import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Sevk edilebilir ürünler ve mamül depo miktarları
export async function GET() {
  try {
    const db = getDatabase()

    // Sevk edilebilir ürünleri getir (müşteriye göre grupla)
    // Sadece production_order tamamlanmış ürünleri göster
    const readyItems = db.prepare(`
      SELECT 
        psn.customer_id,
        a.name as customer_name,
        a.code as customer_code,
        psn.product_id,
        p.name as product_name,
        p.sku as product_sku,
        COUNT(*) as ready_count
      FROM product_serial_numbers psn
      JOIN products p ON psn.product_id = p.id
      LEFT JOIN accounts a ON psn.customer_id = a.id
      LEFT JOIN production_orders po ON psn.production_order_id = po.id
      WHERE psn.ready_for_shipment = 1
        AND psn.status = 'in_stock'
        AND (psn.shipment_id IS NULL OR psn.shipment_id = '')
        AND (psn.production_order_id IS NULL 
             OR po.status = 'completed'
             OR (po.status IS NULL))
      GROUP BY psn.customer_id, psn.product_id
      ORDER BY COALESCE(psn.customer_id, 'no-customer'), p.sku
    `).all()

    // Mamül depo stok miktarlarını getir
    const productStocks = db.prepare(`
      SELECT 
        id,
        sku,
        name,
        stock_amount
      FROM products
      ORDER BY sku
    `).all()

    // Müşterilere göre grupla
    const grouped: Record<string, any> = {}
    readyItems.forEach((item: any) => {
      const customerId = item.customer_id || 'no-customer'
      const customerName = item.customer_name || 'Müşteri Seçilmemiş'
      const customerCode = item.customer_code || '-'

      if (!grouped[customerId]) {
        grouped[customerId] = {
          customer_id: customerId,
          customer_name: customerName,
          customer_code: customerCode,
          products: [],
        }
      }

      // Mamül depo stok miktarını bul
      const productStock = productStocks.find((p: any) => p.id === item.product_id)
      
      grouped[customerId].products.push({
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        ready_count: item.ready_count,
        warehouse_stock: productStock?.stock_amount || 0,
      })
    })

    return NextResponse.json({
      customers: Object.values(grouped),
      total_ready: readyItems.reduce((sum: number, item: any) => sum + item.ready_count, 0),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


