'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Receipt, RefreshCw, ArrowLeft, FileDown } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { LogoWithBackground } from '@/components/Logo'
import { ReportFilters, getDefaultReportFilters } from '@/components/filters/ReportFilters'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from '@/lib/notify'
import * as XLSX from 'xlsx'

type TaxSummaryRes = {
  data?: {
    from?: string
    to?: string
    totalInvoices?: number
    totalTax?: number
    totalFinal?: number
    byRate?: Array<{
      tax_rate: number
      tax_rate_label: string
      invoice_count: number
      total_tax: number
      total_final: number
      total_before_tax: number
    }>
  }
}

export default function TaxSummaryReportPage() {
  const user = useAuthStore((s) => s.user)
  const canExport = user?.can_export !== 0
  const [filters, setFilters] = useState(getDefaultReportFilters)
  const [data, setData] = useState<TaxSummaryRes['data'] | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetchApi<TaxSummaryRes>(`/api/reports/tax-summary?from=${filters.from}&to=${filters.to}`)
      .then((res) => {
        const d = res?.data
        setData(d ?? null)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [filters.from, filters.to])

  function downloadExcel() {
    if (!data?.byRate?.length) {
      toast.warning('Dışa aktarılacak veri yok')
      return
    }
    const rows = data.byRate.map((r) => ({
      'KDV Oranı': r.tax_rate_label,
      'Fatura Sayısı': r.invoice_count,
      'KDV Toplamı (₺)': r.total_tax,
      'Genel Toplam (₺)': r.total_final,
      'Matrah (₺)': r.total_before_tax,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'KDV Ozet')
    XLSX.writeFile(wb, `kdv_ozet_${filters.from ?? ''}_${filters.to ?? ''}.xlsx`)
    toast.success('Excel indirildi')
  }

  const summary = data
  const byRate = summary?.byRate ?? []

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
              KDV / Vergi Özeti
            </h1>
            <LogoWithBackground size="sm" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportFilters value={filters} onChange={setFilters} />
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Güncelle
          </button>
          {canExport && (
            <button
              type="button"
              onClick={downloadExcel}
              disabled={!byRate.length}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Excel
            </button>
          )}
        </div>
      </div>

      {loading && !summary ? (
        <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Fatura Sayısı</p>
              <p className="text-white text-2xl font-semibold">{summary?.totalInvoices ?? 0}</p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">KDV Toplamı (₺)</p>
              <p className="text-white text-2xl font-semibold">
                {(summary?.totalTax ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Genel Toplam (₺)</p>
              <p className="text-white text-2xl font-semibold">
                {(summary?.totalFinal ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="py-3 px-4">KDV Oranı</th>
                  <th className="py-3 px-4 text-right">Fatura Sayısı</th>
                  <th className="py-3 px-4 text-right">Matrah (₺)</th>
                  <th className="py-3 px-4 text-right">KDV (₺)</th>
                  <th className="py-3 px-4 text-right">Genel Toplam (₺)</th>
                </tr>
              </thead>
              <tbody>
                {byRate.map((r) => (
                  <tr key={r.tax_rate} className="border-b border-gray-800/50 text-gray-200">
                    <td className="py-2 px-4 font-medium">{r.tax_rate_label}</td>
                    <td className="py-2 px-4 text-right">{r.invoice_count}</td>
                    <td className="py-2 px-4 text-right">
                      {(r.total_before_tax ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-4 text-right">
                      {(r.total_tax ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-4 text-right">
                      {(r.total_final ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {byRate.length === 0 && (
              <p className="py-8 text-center text-gray-500">Seçilen dönemde fatura bulunamadı.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
