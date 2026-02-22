'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, RefreshCw, ArrowLeft, Printer, FileDown } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { fetchApi } from '@/lib/api/client'
import { LogoWithBackground } from '@/components/Logo'
import { formatDate } from '@/lib/utils/dateFormat'
import { ReportFilters, getDefaultReportFilters } from '@/components/filters/ReportFilters'
import { useAuthStore } from '@/lib/store/authStore'

type SalesSummaryRes = {
  from: string | null
  to: string | null
  summary: { count: number; totalAmount: number; totalQuantity: number }
  items: Array<{
    id: string
    shipment_number: string
    shipment_date: string
    final_amount: number | null
    total_quantity: number | null
    status: string
    customer_name: string | null
    customer_code: string | null
  }>
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  in_transit: 'Yolda',
  delivered: 'Teslim Edildi',
  shipped: 'Sevk Edildi',
  cancelled: 'İptal',
  ready: 'Hazır',
  preparing: 'Hazırlanıyor',
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export default function SalesSummaryReportPage() {
  const user = useAuthStore((s) => s.user)
  const canExport = user?.can_export !== 0
  const [filters, setFilters] = useState(getDefaultReportFilters)
  const [data, setData] = useState<SalesSummaryRes | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetchApi<SalesSummaryRes>(`/api/reports/sales-summary?from=${filters.from}&to=${filters.to}`)
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

  function downloadPdf() {
    if (!data) return
    const doc = new jsPDF()
    doc.setFontSize(14)
    doc.text('Satis Ozet Raporu', 14, 16)
    doc.setFontSize(10)
    doc.text(`Donem: ${filters.from ?? ''} - ${filters.to ?? ''}`, 14, 24)
    doc.text(`Sevkiyat: ${data.summary?.count ?? 0}  |  Toplam Tutar: ${(data.summary?.totalAmount ?? 0).toLocaleString('tr-TR')} TL  |  Miktar: ${data.summary?.totalQuantity ?? 0}`, 14, 32)
    let y = 42
    doc.setFontSize(9)
    ;(data.items ?? []).slice(0, 40).forEach((row) => {
      doc.text(`${row.shipment_number} | ${formatDate(row.shipment_date)} | ${(row.customer_name ?? row.customer_code ?? '').slice(0, 20)} | ${(row.final_amount ?? 0).toLocaleString('tr-TR')}`, 14, y)
      y += 5
      if (y > 275) {
        doc.addPage()
        y = 16
      }
    })
    doc.save(`satis_ozet_${filters.from ?? 'tarih'}_${filters.to ?? ''}.pdf`)
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
              <TrendingUp className="w-6 h-6 text-blue-400" />
              Satış Özeti
            </h1>
            <LogoWithBackground size="sm" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportFilters value={filters} onChange={setFilters} />
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Güncelle
          </button>
          <button type="button" onClick={() => window.print()} className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Yazdır
          </button>
          {canExport && (
          <button
            type="button"
            onClick={downloadPdf}
            disabled={!data}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            PDF İndir
          </button>
          )}
        </div>
      </div>

      {loading && !data ? (
        <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Sevkiyat Sayısı</p>
              <p className="text-white text-2xl font-semibold">{data.summary?.count ?? 0}</p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Toplam Tutar (₺)</p>
              <p className="text-white text-2xl font-semibold">
                {(data.summary?.totalAmount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Toplam Miktar</p>
              <p className="text-white text-2xl font-semibold">{data.summary?.totalQuantity ?? 0}</p>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="py-3 px-4">Sevkiyat No</th>
                    <th className="py-3 px-4">Tarih</th>
                    <th className="py-3 px-4">Müşteri</th>
                    <th className="py-3 px-4 text-right">Miktar</th>
                    <th className="py-3 px-4 text-right">Tutar (₺)</th>
                    <th className="py-3 px-4">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.items ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-gray-800/50 text-gray-200">
                      <td className="py-2 px-4 font-medium">{row.shipment_number}</td>
                      <td className="py-2 px-4">{formatDate(row.shipment_date)}</td>
                      <td className="py-2 px-4">{row.customer_name ?? row.customer_code ?? '–'}</td>
                      <td className="py-2 px-4 text-right">{row.total_quantity ?? 0}</td>
                      <td className="py-2 px-4 text-right">{(row.final_amount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 px-4">{getStatusLabel(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!(data.items ?? []).length && (
              <p className="py-8 text-center text-gray-500">Bu dönemde sevkiyat bulunamadı.</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-gray-500 py-8">Veri yüklenemedi.</p>
      )}
    </div>
  )
}
