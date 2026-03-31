import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'

export const GET = withAuth(async (_request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId } = authUser
    const db = getDatabase()

    // 1. Ürün Bazlı Kar Marjı Hesaplama
    const products = db.prepare(`
      SELECT 
        p.id, p.name, p.sku, p.price as cost_price, p.selling_price, p.labor_cost,
        bv.id as bom_version_id
      FROM products p
      LEFT JOIN bom_versions bv ON p.id = bv.product_id AND bv.is_active = 1
      WHERE p.company_id = ? AND p.branch_id = ? AND p.deleted_at IS NULL
    `).all(companyId, branchId) as any[]

    const productCosts = products.map(p => {
      // Reçete maliyetini hesapla
      let materialCost = 0
      if (p.bom_version_id) {
        const bomItems = db.prepare(`
          SELECT b.quantity_required, b.waste_percentage, m.unit_price
          FROM bom b
          JOIN materials m ON b.material_id = m.id
          WHERE b.version_id = ? AND b.deleted_at IS NULL
        `).all(p.bom_version_id) as any[]

        materialCost = bomItems.reduce((acc, item) => {
          const wasteMultiplier = 1 + (item.waste_percentage || 0) / 100
          return acc + (item.quantity_required * item.unit_price * wasteMultiplier)
        }, 0)
      }

      const totalCost = materialCost + (p.labor_cost || 0)
      const margin = p.selling_price > 0 
        ? Math.round(((p.selling_price - totalCost) / p.selling_price) * 100) 
        : 0

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        materialCost: Number(materialCost.toFixed(2)),
        laborCost: p.labor_cost || 0,
        totalCost: Number(totalCost.toFixed(2)),
        sellingPrice: p.selling_price || 0,
        margin: margin
      }
    })

    return ok({
      products: productCosts,
      summary: {
        totalProducts: productCosts.length,
        avgMargin: productCosts.length > 0 
          ? Math.round(productCosts.reduce((acc, curr) => acc + curr.margin, 0) / productCosts.length)
          : 0,
        mostProfitable: productCosts.sort((a, b) => b.margin - a.margin).slice(0, 5),
        leastProfitable: productCosts.sort((a, b) => a.margin - b.margin).slice(0, 5)
      }
    })
  })
})
