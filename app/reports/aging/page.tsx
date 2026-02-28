'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Receipt, RefreshCw, ArrowLeft, FileDown, FileText } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from '@/lib/notify'
import { LogoWithBackground } from '@/components/Logo'
import { NewFeatureHighlight } from '@/components/NewFeatureHighlight'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'

type AgingItem = {
  id: string
  code: string | null
  name: string
  balance: number
  risk_limit: number | null
  days_since_transaction: number | null
  aging_bucket: string
  last_transaction_at: string | null
}

type AgingRes = {
  summary: {
    totalReceivables: number
    count: number
    byAgingBucket: Record<string, number>
  }
  items: AgingItem[]
}

const BUCKET_LABELS: Record<string, string> = {
  current: 'Güncel (0 gün)',
  '1-30': '1-30 gün',
  '31-60': '31-60 gün',
  '61-90': '61-90 gün',
  '90+': '90+ gün',
}

/** PDF'de okunaklı metin için Türkçe karakterleri ASCII'ye çevirir (jsPDF varsayılan fontu Türkçe desteklemez). */
function pdfSafeText(s: string): string {
  return (s ?? '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
}

export default function AgingReportPage() {
  const user = useAuthStore((s) => s.user)
  const canExport = user?.can_export !== 0
  const [data, setData] = useState<AgingRes | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetchApi<AgingRes>('/api/reports/aging-receivables')
      .then((res: any) => {
        const d = res?.data ?? res
        setData(d)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function downloadExcel() {
    if (!data?.items?.length) {
      toast.warning('Dışa aktarılacak veri yok')
      return
    }
    const rows = data.items.map((r) => ({
      Kod: r.code ?? '',
      'Cari Adı': r.name,
      'Bakiye (₺)': r.balance,
      'Yaş (gün)': r.days_since_transaction ?? '',
      Grup: BUCKET_LABELS[r.aging_bucket] ?? r.aging_bucket,
      'Son İşlem': r.last_transaction_at ? new Date(r.last_transaction_at).toLocaleDateString('tr-TR') : '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Cari Yaslandirma')
    XLSX.writeFile(wb, `cari_yaslandirma_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Excel indirildi')
  }

  function downloadPdf() {
    if (!data) {
      toast.warning('Rapor verisi yok')
      return
    }
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text(pdfSafeText('Cari Yaşlandırma (Alacaklar)'), 14, 16)
    doc.setFontSize(10)
    doc.text(
      pdfSafeText(
        `Toplam Alacak: ${(data.summary?.totalReceivables ?? 0).toLocaleString('tr-TR')} TL  |  Cari Sayısı: ${data.summary?.count ?? 0}`
      ),
      14,
      24
    )
    let y = 34
    doc.setFontSize(9)
    ;(data.items ?? []).slice(0, 50).forEach((row) => {
      const line = `${(row.code ?? '').slice(0, 10)} | ${row.name.slice(0, 18)} | ${row.balance.toLocaleString('tr-TR')} | ${row.days_since_transaction ?? '-'} | ${BUCKET_LABELS[row.aging_bucket] ?? row.aging_bucket}`
      doc.text(pdfSafeText(line), 14, y)
      y += 5
      if (y > 275) {
        doc.addPage()
        y = 16
      }
    })
    doc.save(`cari_yaslandirma_${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success('PDF indirildi')
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Receipt className="w-6 h-6 text-green-400" />
              Cari Yaşlandırma (Alacaklar)
            </h1>
            <LogoWithBackground size="sm" />
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Güncelle
        </button>
        {canExport && (
          <NewFeatureHighlight featureId="aging_export">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadExcel}
                disabled={!data?.items?.length}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Excel
              </button>
              <button
                type="button"
                onClick={downloadPdf}
                disabled={!data}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 disabled:opacity-50 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                PDF
              </button>
            </div>
          </NewFeatureHighlight>
        )}
      </div>

      {loading && !data ? (
        <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Toplam Alacak (₺)</p>
              <p className="text-white text-2xl font-semibold">
                {(data.summary?.totalReceivables ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Cari Hesap Sayısı</p>
              <p className="text-white text-2xl font-semibold">{data.summary?.count ?? 0}</p>
            </div>
            {data.summary?.byAgingBucket && Object.entries(data.summary.byAgingBucket).length > 0 && (
              <>
                {Object.entries(data.summary.byAgingBucket).map(([bucket, amount]) => (
                  <div key={bucket} className="bg-gray-900 rounded-lg border border-gray-800 p-4">
                    <p className="text-gray-400 text-sm">{BUCKET_LABELS[bucket] ?? bucket}</p>
                    <p className="text-white text-xl font-semibold">
                      {Number(amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="py-3 px-4">Kod</th>
                    <th className="py-3 px-4">Cari Adı</th>
                    <th className="py-3 px-4 text-right">Bakiye (₺)</th>
                    <th className="py-3 px-4">Yaş (gün)</th>
                    <th className="py-3 px-4">Grup</th>
                    <th className="py-3 px-4">Son İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.items ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-gray-800/50 text-gray-200">
                      <td className="py-2 px-4">{row.code ?? '–'}</td>
                      <td className="py-2 px-4 font-medium">{row.name}</td>
                      <td className="py-2 px-4 text-right">{row.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 px-4">{row.days_since_transaction ?? '–'}</td>
                      <td className="py-2 px-4">{BUCKET_LABELS[row.aging_bucket] ?? row.aging_bucket}</td>
                      <td className="py-2 px-4">{row.last_transaction_at ? new Date(row.last_transaction_at).toLocaleDateString('tr-TR') : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!(data.items ?? []).length && (
              <p className="py-8 text-center text-gray-500">Alacak bakiyeli cari hesap bulunamadı.</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-gray-500 py-8">Veri yüklenemedi.</p>
      )}
    </div>
  )
}
