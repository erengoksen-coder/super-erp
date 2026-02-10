import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { EXPORT_MAX_LIMIT } from '@/lib/constants'
import * as XLSX from 'xlsx'
import { materialsRepo } from '@/lib/repositories/materials'

// GET: Malzeme listesini Excel olarak dışa aktar
export const GET = withAuth(async () => {
  try {
    const rows = materialsRepo.getAll().slice(0, EXPORT_MAX_LIMIT)
    const exportRows = rows.map((m) => ({
      'Kod': m.code ?? '',
      'Ad': m.name,
      'Kategori': m.category ?? '',
      'Birim': m.unit,
      'Stok Miktarı': m.stock_amount,
      'Min. Stok': m.min_stock_level,
      'Birim Fiyat': m.unit_price,
      'Giriş Toplam': (m as { total_in?: number }).total_in ?? 0,
      'Çıkış Toplam': (m as { total_out?: number }).total_out ?? 0,
    }))
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.json_to_sheet(exportRows)
    XLSX.utils.book_append_sheet(workbook, sheet, 'Malzemeler')
    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="malzeme_listesi_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Export hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
