import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { EXPORT_MAX_LIMIT } from '@/lib/constants'
import * as XLSX from 'xlsx'

export const GET = withAuth(async (request) => {
  try {
    const db = getDatabase()
    const materialsRaw = db.prepare(`
      SELECT code, name, unit, stock_amount, min_stock_level
      FROM materials
      WHERE deleted_at IS NULL
      ORDER BY name
      LIMIT ?
    `).all(EXPORT_MAX_LIMIT) as Array<Record<string, string | number | null>>

    const productsRaw = db.prepare(`
      SELECT sku, name, stock_amount, min_stock_level
      FROM active_products
      ORDER BY sku
      LIMIT ?
    `).all(EXPORT_MAX_LIMIT) as Array<Record<string, string | number | null>>

    const materials = materialsRaw.map((m) => ({
      'Kod': m.code ?? '',
      'Hammadde Adı': m.name ?? '',
      'Birim': m.unit ?? '',
      'Mevcut Stok': m.stock_amount ?? 0,
      'Min. Stok': m.min_stock_level ?? 0,
    }))
    const products = productsRaw.map((p) => ({
      'SKU': p.sku ?? '',
      'Ürün Adı': p.name ?? '',
      'Mevcut Stok': p.stock_amount ?? 0,
      'Min. Stok': p.min_stock_level ?? 0,
    }))

    const workbook = XLSX.utils.book_new()
    const materialsSheet = XLSX.utils.json_to_sheet(materials)
    const productsSheet = XLSX.utils.json_to_sheet(products)
    materialsSheet['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 8 }, { wch: 12 }, { wch: 10 }]
    productsSheet['!cols'] = [{ wch: 16 }, { wch: 32 }, { wch: 12 }, { wch: 10 }]

    XLSX.utils.book_append_sheet(workbook, materialsSheet, 'Malzemeler')
    XLSX.utils.book_append_sheet(workbook, productsSheet, 'Ürünler')

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="stok_raporu_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
