import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { apiLogger } from '@/lib/api/logger'

// GET: Kritik seviyenin altına düşen malzemeleri getir; önerilen miktar BOM + açık siparişlere göre hesaplanır
export const GET = withAuth(async (request) => {
  try {
    const db = getDatabase()

    // 1) Siparişlerdeki (pending + in_production) ürün miktarları × BOM kullanımı = malzeme ihtiyacı (material_id bazında)
    const neededByMaterial = db.prepare(`
      SELECT 
        b.material_id,
        COALESCE(SUM(
          o.quantity * b.quantity_required * (1 + COALESCE(b.fire_percentage, 0) / 100)
        ), 0) as needed_for_orders
      FROM orders o
      JOIN bom b ON b.product_id = o.product_id AND b.deleted_at IS NULL
      JOIN bom_versions bv ON bv.id = b.version_id AND bv.is_active = 1 AND (bv.deleted_at IS NULL OR bv.deleted_at = '')
      WHERE o.deleted_at IS NULL
        AND o.status IN ('pending', 'in_production')
      GROUP BY b.material_id
    `).all() as Array<{ material_id: string; needed_for_orders: number }>

    const neededMap = new Map(neededByMaterial.map((r) => [r.material_id, r.needed_for_orders]))

    // 2) Kritik malzemeler (dashboard ile aynı kriter)
    const rows = db.prepare(`
      SELECT 
        m.id, m.code, m.name, m.category, m.unit, m.min_stock_level, m.unit_price, m.purchase_price, m.supplier_id,
        m.last_purchase_date,
        COALESCE(m.stock_amount, 0) as stock_amount,
        a.name as supplier_name,
        a.code as supplier_code,
        a.phone as supplier_phone,
        a.email as supplier_email,
        (m.min_stock_level - COALESCE(m.stock_amount, 0)) as shortage
      FROM materials m
      LEFT JOIN accounts a ON m.supplier_id = a.id
      WHERE m.deleted_at IS NULL
        AND m.min_stock_level IS NOT NULL
        AND (m.stock_amount IS NULL OR m.stock_amount < m.min_stock_level)
      ORDER BY (m.min_stock_level - COALESCE(m.stock_amount, 0)) DESC, m.name ASC
    `).all() as Array<{
      id: string
      code: string
      name: string
      category: string
      unit: string
      min_stock_level: number
      unit_price: number
      purchase_price: number
      supplier_id: string | null
      last_purchase_date: string | null
      stock_amount: number
      supplier_name: string | null
      supplier_code: string | null
      supplier_phone: string | null
      supplier_email: string | null
      shortage: number
    }>

    const criticalMaterials = rows.map((r) => {
      const shortage = Number(r.shortage)
      const neededForOrders = neededMap.get(r.id) ?? 0
      const suggested_quantity = Math.max(shortage, neededForOrders)
      return { ...r, shortage, suggested_quantity }
    })

    return NextResponse.json(criticalMaterials)
  } catch (error: any) {
    apiLogger.error('Critical stock GET failed', { error: error?.message })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})


