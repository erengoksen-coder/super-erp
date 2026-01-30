import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import * as XLSX from 'xlsx'

export const GET = withAuth(async (request) => {
  try {
    const db = getDatabase()
    const materials = db.prepare(`
      SELECT code, name, unit, stock_amount, min_stock_level
      FROM materials
      ORDER BY name
    `).all() as Array<Record<string, string | number | null>>

    const products = db.prepare(`
      SELECT sku, name, stock_amount, min_stock_level
      FROM active_products
      ORDER BY sku
    `).all() as Array<Record<string, string | number | null>>

    const workbook = XLSX.utils.book_new()
    const materialsSheet = XLSX.utils.json_to_sheet(materials)
    const productsSheet = XLSX.utils.json_to_sheet(products)

    XLSX.utils.book_append_sheet(workbook, materialsSheet, 'Malzemeler')
    XLSX.utils.book_append_sheet(workbook, productsSheet, 'Urunler')

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
