'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Factory, RefreshCw, ArrowLeft } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { LogoWithBackground } from '@/components/Logo'

type ProductionRes = {
  from: string | null
  to: string | null
  summary: {
    byStatus: Record<string, { count: number; totalQuantity: number }>
    completedInPeriod: { count: number; totalQuantity: number }
    overall: Record<string, number>
  }
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Açık',
  in_progress: 'Üretimde',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
}

export default function ProductionEfficiencyReportPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
  const [data, setData] = useState<ProductionRes | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetchApi<ProductionRes>(`/api/reports/production-efficiency?from=${from}&to=${to}`)
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

  const summary = data?.summary
  const byStatus = summary?.byStatus ?? {}
  const completed = summary?.completedInPeriod ?? { count: 0, totalQuantity: 0 }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Factory className="w-6 h-6 text-violet-400" />
              Üretim Verimliliği
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
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 flex items-center gap-2"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Dönemde Tamamlanan (adet)</p>
              <p className="text-white text-2xl font-semibold">{completed.count ?? 0}</p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Dönemde Tamamlanan (miktar)</p>
              <p className="text-white text-2xl font-semibold">{completed.totalQuantity ?? 0}</p>
            </div>
            {Object.entries(byStatus).map(([status, val]) => (
              <div key={status} className="bg-gray-900 rounded-lg border border-gray-800 p-4">
                <p className="text-gray-400 text-sm">{STATUS_LABELS[status] ?? status}</p>
                <p className="text-white text-xl font-semibold">{val.count} emir, {val.totalQuantity} adet</p>
              </div>
            ))}
          </div>
          {summary?.overall && Object.keys(summary.overall).length > 0 && (
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h2 className="text-white font-semibold mb-3">Genel Durum (tüm emirler)</h2>
              <div className="flex flex-wrap gap-4">
                {Object.entries(summary.overall).map(([status, cnt]) => (
                  <span key={status} className="text-gray-300">
                    {STATUS_LABELS[status] ?? status}: <strong className="text-white">{cnt}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 py-8">Veri yüklenemedi.</p>
      )}
    </div>
  )
}
