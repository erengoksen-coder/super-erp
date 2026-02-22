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
      'Hammadde Adı': m.name,
      'Kategori': m.category ?? '',
      'Birim': m.unit,
      'Toplam Giriş': (m as { total_in?: number }).total_in ?? 0,
      'Toplam Çıkış': (m as { total_out?: number }).total_out ?? 0,
      'Mevcut Stok': m.stock_amount,
      'Min. Stok': m.min_stock_level,
      'Birim Fiyat': m.unit_price,
    }))
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.json_to_sheet(exportRows)
    sheet['!cols'] = [
      { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    ]
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
