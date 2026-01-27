import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

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

export async function GET() {
  try {
    const db = getDatabase()
    const materials = db.prepare(`
      SELECT id, code, name, unit, stock_amount, min_stock_level
      FROM materials
      ORDER BY name
    `).all() as MaterialRow[]

    const products = db.prepare(`
      SELECT id, sku, name, stock_amount, min_stock_level
      FROM products
      ORDER BY sku
    `).all() as ProductRow[]

    const materialsCritical = materials.filter(
      (item) => (item.stock_amount ?? 0) < (item.min_stock_level ?? 0)
    ).length
    const productsCritical = products.filter(
      (item) => (item.stock_amount ?? 0) < (item.min_stock_level ?? 0)
    ).length

    return NextResponse.json(
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
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
