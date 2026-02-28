import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { resolveUnitFactor } from '@/lib/units'
import { createSuccessResponse, withRouteHandler } from '@/lib/utils/errors'

export type ProductUnitCostItem = {
  product_id: string
  product_sku: string
  product_name: string
  unit: string | null
  /** Birim başına malzeme maliyeti (fire dahil) */
  unit_material_cost: number
  /** Birim başına işçilik maliyeti */
  unit_labor_cost: number
  /** Birim toplam maliyet */
  unit_total_cost: number
  /** Satış fiyatı (birim) */
  selling_price: number
  /** Birim kar */
  unit_profit: number
  /** Kar marjı % */
  profit_margin_pct: number
  /** Malzeme detayı (BOM satırları) */
  material_breakdown: Array<{
    material_id: string
    material_name: string
    material_unit: string | null
    quantity_per_unit: number
    fire_percentage: number
    unit_price: number
    line_cost_per_unit: number
  }>
}

/**
 * GET: Tüm ürünler için birim maliyet detayı (BOM + hammadde fiyatları + işçilik).
 * BOM'u olmayan ürünler sadece işçilik/satış fiyatı ile döner.
 */
export const GET = withRouteHandler(
  withAuth(async (request: NextRequest) => {
    const db = getDatabase()
    const productId = request.nextUrl.searchParams.get('product_id')?.trim() || null

    const products = db.prepare(`
      SELECT id, sku, name, unit, COALESCE(price, 0) as selling_price, COALESCE(labor_cost, 0) as labor_cost
      FROM products
      WHERE deleted_at IS NULL
      ${productId ? 'AND id = ?' : ''}
      ORDER BY sku
    `).all(productId ? [productId] : []) as Array<{
      id: string
      sku: string
      name: string
      unit: string | null
      selling_price: number
      labor_cost: number
    }>

    const result: ProductUnitCostItem[] = []

    for (const p of products) {
      const bomRows = db.prepare(`
        SELECT
          b.material_id,
          b.quantity_required,
          b.unit as bom_unit,
          COALESCE(b.fire_percentage, 0) as fire_percentage,
          m.name as material_name,
          m.unit as material_unit,
          COALESCE(m.purchase_price, 0) as purchase_price
        FROM bom b
        JOIN materials m ON b.material_id = m.id
        LEFT JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL
        WHERE b.product_id = ? AND b.deleted_at IS NULL
          AND (b.version_id IS NULL OR (bv.id IS NOT NULL AND bv.is_active = 1))
      `).all(p.id) as Array<{
        material_id: string
        quantity_required: number
        bom_unit: string | null
        fire_percentage: number
        material_name: string
        material_unit: string | null
        purchase_price: number
      }>

      let unitMaterialCost = 0
      const materialBreakdown: ProductUnitCostItem['material_breakdown'] = []

      for (const row of bomRows) {
        const firePct = row.fire_percentage || 0
        const qtyWithFire = row.quantity_required * (1 + firePct / 100)
        const fromUnit = (row.bom_unit || row.material_unit || '').toString()
        const toUnit = (row.material_unit || '').toString()
        const factor = resolveUnitFactor(db, row.material_id, fromUnit, toUnit)
        const convertedQty = factor ? qtyWithFire * factor : qtyWithFire
        const lineCostPerUnit = convertedQty * row.purchase_price
        unitMaterialCost += lineCostPerUnit
        materialBreakdown.push({
          material_id: row.material_id,
          material_name: row.material_name,
          material_unit: row.material_unit,
          quantity_per_unit: convertedQty,
          fire_percentage: firePct,
          unit_price: row.purchase_price,
          line_cost_per_unit: lineCostPerUnit,
        })
      }

      const unitLaborCost = p.labor_cost || 0
      const unitTotalCost = unitMaterialCost + unitLaborCost
      const sellingPrice = p.selling_price || 0
      const unitProfit = sellingPrice - unitTotalCost
      const profitMarginPct = unitTotalCost > 0 ? (unitProfit / unitTotalCost) * 100 : (sellingPrice > 0 ? 100 : 0)

      result.push({
        product_id: p.id,
        product_sku: p.sku,
        product_name: p.name,
        unit: p.unit,
        unit_material_cost: Math.round(unitMaterialCost * 100) / 100,
        unit_labor_cost: unitLaborCost,
        unit_total_cost: Math.round(unitTotalCost * 100) / 100,
        selling_price: sellingPrice,
        unit_profit: Math.round(unitProfit * 100) / 100,
        profit_margin_pct: Math.round(profitMarginPct * 10) / 10,
        material_breakdown,
      })
    }

    return createSuccessResponse(result)
  })
)
