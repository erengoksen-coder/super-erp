'use client'

import { useEffect, useState } from 'react'
import { Flame, RefreshCw } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { LogoWithBackground } from '@/components/Logo'

import { TableSkeleton } from '@/components/ui/Skeleton'

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
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0])
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
        `/api/finance/fire-analysis?start=${startDate}&end=${endDate}`
      )
      setData(response)
    } catch (error) {
      console.error('Fire analysis load error:', error)
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
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50 flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Yenile</span>
        </button>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Başlangıç</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Bitiş</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadData}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition disabled:opacity-50"
            >
              Filtrele
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Toplam Plan</p>
              <p className="text-white text-2xl font-semibold">{totals.total_planned.toFixed(2)}</p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Toplam Fiili</p>
              <p className="text-white text-2xl font-semibold">{totals.total_actual.toFixed(2)}</p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Toplam Fire</p>
              <p className="text-orange-400 text-2xl font-semibold">{totals.total_fire.toFixed(2)}</p>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <p className="text-gray-400 text-sm">Maliyet Sapması</p>
              <p className="text-red-400 text-2xl font-semibold">{totals.total_cost_variance.toFixed(2)} ₺</p>
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
