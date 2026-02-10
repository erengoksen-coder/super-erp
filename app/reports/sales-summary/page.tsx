'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, RefreshCw, ArrowLeft } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { LogoWithBackground } from '@/components/Logo'
import { formatDate } from '@/lib/utils/dateFormat'

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

export default function SalesSummaryReportPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
  const [data, setData] = useState<SalesSummaryRes | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetchApi<SalesSummaryRes>(`/api/reports/sales-summary?from=${from}&to=${to}`)
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
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          />
          <span className="text-gray-500">–</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          />
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Güncelle
          </button>
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
                      <td className="py-2 px-4">{row.status}</td>
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
