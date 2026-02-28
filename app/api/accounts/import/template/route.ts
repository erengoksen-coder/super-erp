import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import * as XLSX from 'xlsx'

/** GET: Cari hesap toplu yükleme için Excel şablonu indir */
export const GET = withAuth(async () => {
  const template = [
    {
      'Kod': 'MUS-0001',
      'Ad/Ünvan': 'Örnek Müşteri',
      'Tip': 'customer',
      'Vergi No': '',
      'Telefon': '',
      'E-posta': '',
      'Adres': '',
      'Risk Limiti': 0,
      'İskonto Oranı': 0,
    },
  ]
  const ws = XLSX.utils.json_to_sheet(template)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Cari Hesaplar')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filename = `Cari_Sablonu_${new Date().toISOString().split('T')[0]}.xlsx`
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
