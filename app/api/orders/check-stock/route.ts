import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { resolveUnitFactor } from '@/lib/units'

// GET: Seçilen siparişlerin stok kontrolünü yap
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const orderIdsParam = searchParams.get('order_ids')
    
    if (!orderIdsParam) {
      return NextResponse.json({ error: 'Sipariş ID\'leri gerekli' }, { status: 400 })
    }
    
    const orderIds = orderIdsParam.split(',').filter(id => id.trim())
    
    if (orderIds.length === 0) {
      return NextResponse.json({ error: 'En az bir sipariş ID\'si gerekli' }, { status: 400 })
    }
    
    const db = getDatabase()
    const results: any[] = []
    
    // Her sipariş için stok kontrolü yap
    for (const orderId of orderIds) {
      const order = db.prepare('SELECT * FROM active_orders WHERE id = ?').get(orderId) as any
      
      if (!order) {
        results.push({
          order_id: orderId,
          order_number: 'Bilinmeyen',
          can_produce: false,
          reason: 'Sipariş bulunamadı',
          stock_issues: []
        })
        continue
      }
      
      // Ürün ID kontrolü
      let productId = order.product_id
      if (!productId) {
        // Ürün eşleştirilmemiş, ürünü bul
        if (order.product_sku) {
          const product = db.prepare('SELECT id FROM active_products WHERE sku = ?').get(order.product_sku) as any
          if (product) {
            productId = product.id
          }
        }
        
        if (!productId && order.product_name) {
          const product = db.prepare('SELECT id FROM active_products WHERE name LIKE ?').get(`%${order.product_name}%`) as any
          if (product) {
            productId = product.id
          }
        }
      }
      
      if (!productId) {
        results.push({
          order_id: orderId,
          order_number: order.order_number,
          product_name: order.product_name,
          can_produce: false,
          reason: 'Ürün bulunamadı',
          stock_issues: []
        })
        continue
      }
      
      // Ürün bilgisini al
      const product = db.prepare('SELECT * FROM active_products WHERE id = ?').get(productId) as any
      if (!product) {
        results.push({
          order_id: orderId,
          order_number: order.order_number,
          product_name: order.product_name,
          can_produce: false,
          reason: 'Ürün bilgisi alınamadı',
          stock_issues: []
        })
        continue
      }
      
      // BOM kontrolü
      const bom = db.prepare(`
        SELECT 
          b.material_id,
          b.quantity_required,
          b.unit as unit,
          COALESCE(b.fire_percentage, 0) as fire_percentage,
          m.name as material_name,
          m.stock_amount,
          m.reserved_quantity,
          m.unit as material_unit
        FROM bom b
        JOIN bom_versions bv ON b.version_id = bv.id AND bv.is_active = 1 AND bv.deleted_at IS NULL
        JOIN materials m ON b.material_id = m.id
        WHERE b.product_id = ? AND b.deleted_at IS NULL
      `).all(productId) as any[]
      
      if (!bom || bom.length === 0) {
        results.push({
          order_id: orderId,
          order_number: order.order_number,
          product_name: order.product_name,
          can_produce: false,
          reason: 'Ürün için reçete (BOM) bulunamadı',
          stock_issues: []
        })
        continue
      }
      
      // Stok kontrolü
      const stockIssues: any[] = []
      let canProduce = true
      
      for (const item of bom) {
        const firePercentage = item.fire_percentage || 0
        const quantityWithFire = item.quantity_required * (1 + (firePercentage / 100))
        const fromUnit = (item.unit || item.material_unit || '').toString()
        const toUnit = (item.material_unit || '').toString()
        const factor = resolveUnitFactor(db, item.material_id || null, fromUnit, toUnit)
        const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire
        const required = convertedQuantity * order.quantity
        const available = (item.stock_amount || 0) - (item.reserved_quantity || 0)
        
        if (available < required) {
          const shortage = required - available
          stockIssues.push({
            material_name: item.material_name,
            material_id: item.material_id,
            required: required,
            available: available,
            shortage: shortage,
            unit: item.material_unit
          })
          canProduce = false
        }
      }
      
      results.push({
        order_id: orderId,
        order_number: order.order_number,
        product_name: order.product_name,
        product_id: productId,
        quantity: order.quantity,
        can_produce: canProduce,
        reason: canProduce ? 'Stok yeterli' : 'Stok yetersiz',
        stock_issues: stockIssues
      })
    }
    
    // Üretilebilir ve üretilemez olarak grupla
    const producible = results.filter(r => r.can_produce)
    const notProducible = results.filter(r => !r.can_produce)
    
    return NextResponse.json({
      results,
      producible,
      not_producible: notProducible,
      summary: {
        total: results.length,
        producible_count: producible.length,
        not_producible_count: notProducible.length
      }
    })
  } catch (error: any) {
    console.error('Stok kontrolü hatası:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})







