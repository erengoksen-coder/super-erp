import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import * as XLSX from 'xlsx'

/** GET: Ürün toplu yükleme için Excel şablonu indir */
export const GET = withAuth(async () => {
  const template = [
    {
      'SKU': 'URN-001',
      'Ürün Adı': 'Örnek Ürün',
      'Satış Fiyatı': 100,
      'Min. Stok': 5,
      'İşçilik Maliyeti': 10,
      'Birim': 'Adet',
    },
  ]
  const ws = XLSX.utils.json_to_sheet(template)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ürünler')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filename = `Urun_Sablonu_${new Date().toISOString().split('T')[0]}.xlsx`
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
