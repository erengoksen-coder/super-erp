'use client'

import { useEffect, useState } from 'react'
import { Flame, RefreshCw, Printer } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { LogoWithBackground } from '@/components/Logo'
import { ReportFilters, getDefaultReportFilters } from '@/components/filters/ReportFilters'

type FireAnalysisRow = {
  material_id: string
  material_name: string
  unit: string
  purchase_price: number
  total_planned: number
  total_actual: number
  total_fire: number
  total_variance: number
  variance_percentage: number
  total_cost_variance: number
  order_count: number
}

export default function FireAnalysisPage() {
  const [filters, setFilters] = useState(getDefaultReportFilters)
  const [data, setData] = useState<FireAnalysisRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const response = await fetchApi<FireAnalysisRow[]>(
        `/api/finance/fire-analysis?start=${filters.from}&end=${filters.to}`
      )
      setData(response)
    } catch (error) {
      console.error('Fire analizi yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const totals = data.reduce(
    (acc, row) => {
      acc.total_planned += row.total_planned || 0
      acc.total_actual += row.total_actual || 0
      acc.total_fire += row.total_fire || 0
      acc.total_cost_variance += row.total_cost_variance || 0
      return acc
    },
    { total_planned: 0, total_actual: 0, total_fire: 0, total_cost_variance: 0 }
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
              <Flame className="w-8 h-8 text-orange-400" />
              <span>Fire Analizi</span>
            </h1>
            <LogoWithBackground size="sm" />
          </div>
          <p className="text-gray-400">Planlanan, fiili tüketim ve fire sapmaları</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
          <button type="button" onClick={() => window.print()} className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Yazdır
          </button>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <ReportFilters value={filters} onChange={setFilters} variant="stacked" />
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition disabled:opacity-50"
          >
            Filtrele
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-1">📋 Toplam Plan</div>
              <p className="text-white text-2xl font-bold">{totals.total_planned.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 text-xs font-medium mb-1">✅ Toplam Fiili</div>
              <p className="text-white text-2xl font-bold">{totals.total_actual.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border border-orange-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-orange-400 text-xs font-medium mb-1">🔥 Toplam Fire</div>
              <p className="text-orange-400 text-2xl font-bold">{totals.total_fire.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-400 text-xs font-medium mb-1">💰 Maliyet Sapması</div>
              <p className="text-red-400 text-2xl font-bold">{totals.total_cost_variance.toFixed(2)} ₺</p>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-800/80 text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left">Malzeme</th>
                  <th className="px-4 py-3 text-right">Plan</th>
                  <th className="px-4 py-3 text-right">Fiili</th>
                  <th className="px-4 py-3 text-right">Fire</th>
                  <th className="px-4 py-3 text-right">Sapma</th>
                  <th className="px-4 py-3 text-right">Maliyet</th>
                  <th className="px-4 py-3 text-right">Emir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.map((row) => (
                  <tr key={row.material_id}>
                    <td className="px-4 py-3 text-white">
                      <div className="font-medium">{row.material_name}</div>
                      <div className="text-xs text-gray-400">{row.unit}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-100">{row.total_planned.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-100">{row.total_actual.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-orange-400">{row.total_fire.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right ${row.total_variance > 0 ? 'text-red-400' : 'text-gray-200'}`}>
                      {row.total_variance.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right ${row.total_cost_variance > 0 ? 'text-red-400' : 'text-gray-200'}`}>
                      {row.total_cost_variance.toFixed(2)} ₺
                    </td>
                    <td className="px-4 py-3 text-right text-gray-200">{row.order_count}</td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                      Kayıt bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
