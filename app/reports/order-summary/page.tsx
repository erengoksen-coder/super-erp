'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ClipboardList, RefreshCw, ArrowLeft, Package, Factory, Truck } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { LogoWithBackground } from '@/components/Logo'
import { ReportFilters, getDefaultReportFilters } from '@/components/filters/ReportFilters'

type SummaryRes = {
  from: string | null
  to: string | null
  orders: { count: number; totalAmount: number }
  production: { count: number }
  shipments: { count: number; totalAmount: number; totalQuantity: number }
}

export default function OrderSummaryReportPage() {
  const [filters, setFilters] = useState(getDefaultReportFilters)
  const [data, setData] = useState<SummaryRes | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetchApi<SummaryRes>(`/api/reports/order-production-summary?from=${filters.from}&to=${filters.to}`)
      .then((res: any) => {
        const d = res?.data ?? res
        setData(d)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [filters.from, filters.to])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-amber-400" />
              Sipariş / Üretim Özeti
            </h1>
            <LogoWithBackground size="sm" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportFilters value={filters} onChange={setFilters} />
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 flex items-center gap-2"
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
          <p className="text-gray-400 text-sm mb-4">
            Dönem: {data.from ?? '—'} — {data.to ?? '—'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Package className="w-4 h-4" />
                Sipariş
              </div>
              <p className="text-white text-2xl font-bold">{data.orders?.count ?? 0}</p>
              <p className="text-gray-500 text-sm mt-1">Toplam tutar: {(data.orders?.totalAmount ?? 0).toLocaleString('tr-TR')} TL</p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Factory className="w-4 h-4" />
                Üretim emri
              </div>
              <p className="text-white text-2xl font-bold">{data.production?.count ?? 0}</p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                <Truck className="w-4 h-4" />
                Sevkiyat
              </div>
              <p className="text-white text-2xl font-bold">{data.shipments?.count ?? 0}</p>
              <p className="text-gray-500 text-sm mt-1">Tutar: {(data.shipments?.totalAmount ?? 0).toLocaleString('tr-TR')} TL · Adet: {data.shipments?.totalQuantity ?? 0}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">Veri yüklenemedi.</div>
      )}
    </div>
  )
}
