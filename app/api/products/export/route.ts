import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { EXPORT_MAX_LIMIT } from '@/lib/constants'
import { getExportLimits, applyExportRowLimit } from '@/lib/auth/export-limits'
import { fail } from '@/lib/api/response'
import { apiLogger } from '@/lib/api/logger'
import * as XLSX from 'xlsx'

/** GET: Ürünleri Excel olarak dışa aktar */
export const GET = withAuth(async (request: NextRequest, user: { userId: string; role?: string }) => {
  const db = getDatabase()
  const limits = getExportLimits(db, user.userId, user.role)
  if (!limits.canExport) {
    return fail('Dışa aktarma yetkiniz yok. Yönetici ile iletişime geçin.', { status: 403 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const requestedLimit = Math.min(EXPORT_MAX_LIMIT, parseInt(searchParams.get('limit') || String(EXPORT_MAX_LIMIT), 10) || EXPORT_MAX_LIMIT)
    const limit = applyExportRowLimit(requestedLimit, limits, EXPORT_MAX_LIMIT)

    const rows = db.prepare(`
      SELECT 
        sku as "SKU",
        name as "Ürün Adı",
        COALESCE(price, 0) as "Satış Fiyatı",
        COALESCE(selling_price, 0) as "Satış Fiyatı (Alternatif)",
        COALESCE(stock_amount, 0) as "Stok",
        COALESCE(min_stock_level, 0) as "Min. Stok",
        COALESCE(labor_cost, 0) as "İşçilik Maliyeti",
        unit as "Birim"
      FROM products
      WHERE deleted_at IS NULL
      ORDER BY sku
      LIMIT ?
    `).all(limit) as Record<string, unknown>[]

    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(workbook, sheet, 'Ürünler')
    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="urunler_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Export hatası'
    apiLogger.error('Products export failed', { error: message, userId: user?.userId })
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
