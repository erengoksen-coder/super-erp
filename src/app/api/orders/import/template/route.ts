import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import * as XLSX from 'xlsx'

/** GET: Sipariş toplu yükleme için örnek Excel şablonu indir */
export const GET = withAuth(async () => {
  const template = [
    {
      'Cari Adı': 'Örnek Bayi',
      'Müşteri Adı': 'Örnek Müşteri',
      'Ürün Adı': 'Örnek Ürün',
      'SKU': '',
      'Miktar': 1,
      'Birim Fiyat': 0,
      'Sipariş Tarihi': new Date().toISOString().split('T')[0],
      'Konfigürasyon': '',
      'Kumaş Kodu': '',
      'Notlar': 'Bu satırı silip kendi verilerinizi girin.',
    },
  ]
  const ws = XLSX.utils.json_to_sheet(template)
  ws['!cols'] = [
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 28 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Siparişler')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filename = `Siparis_Sablonu_${new Date().toISOString().split('T')[0]}.xlsx`
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
