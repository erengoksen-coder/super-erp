import { ok, fail } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { CACHE_HEADERS_STATS } from '@/lib/api/cache'

type MaterialRow = {
  id: string
  code: string | null
  name: string
  unit: string | null
  stock_amount: number | null
  min_stock_level: number | null
}

type ProductRow = {
  id: string
  sku: string
  name: string
  stock_amount: number | null
  min_stock_level: number | null
}

export const GET = withAuth(async (request) => {
  return handleApi(async () => {
    const db = getDatabase()
    const materials = db.prepare(`
      SELECT id, code, name, unit, stock_amount, min_stock_level
      FROM materials
      ORDER BY name
    `).all() as MaterialRow[]

    const products = db.prepare(`
      SELECT id, sku, name, stock_amount, min_stock_level
      FROM active_products
      ORDER BY sku
    `).all() as ProductRow[]

    const materialsCritical = materials.filter(
      (item) => (item.stock_amount ?? 0) < (item.min_stock_level ?? 0)
    ).length
    const productsCritical = products.filter(
      (item) => (item.stock_amount ?? 0) < (item.min_stock_level ?? 0)
    ).length

    return ok(
      {
        summary: {
          materials_total: materials.length,
          materials_critical: materialsCritical,
          products_total: products.length,
          products_critical: productsCritical,
        },
        materials,
        products,
      },
      { headers: CACHE_HEADERS_STATS }
    )
  }, { status: 500 })
})
