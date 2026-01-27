'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'

interface FireAnalysis {
  material_id: string
  material_name: string
  unit: string
  total_planned: number
  total_actual: number
  total_fire: number
  total_variance: number
  variance_percentage: number
  total_cost_variance: number
  order_count: number
}

export default function FireAnalysisPage() {
  const [analysis, setAnalysis] = useState<FireAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    loadAnalysis()
  }, [dateRange])

  async function loadAnalysis() {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/finance/fire-analysis?start=${dateRange.start}&end=${dateRange.end}`
      )
      if (!response.ok) throw new Error('Analiz yüklenemedi')
      const data = await response.json()
      setAnalysis(data)
    } catch (error) {
      console.error('Error loading analysis:', error)
      alert('Analiz yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const totalPlanned = analysis.reduce((sum, item) => sum + item.total_planned, 0)
  const totalActual = analysis.reduce((sum, item) => sum + item.total_actual, 0)
  const totalFire = analysis.reduce((sum, item) => sum + item.total_fire, 0)
  const totalVariance = analysis.reduce((sum, item) => sum + item.total_variance, 0)
  const totalCostVariance = analysis.reduce((sum, item) => sum + item.total_cost_variance, 0)
  const avgVariancePercentage = analysis.length > 0
    ? analysis.reduce((sum, item) => sum + item.variance_percentage, 0) / analysis.length
    : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-2">
          <BarChart3 className="w-8 h-8" />
          <span>Fire (Atık) Analizi</span>
        </h1>
        <p className="text-gray-400">Planlanan vs Gerçekleşen malzeme tüketimi analizi</p>
      </div>

      {/* Tarih Aralığı */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Başlangıç Tarihi</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Bitiş Tarihi</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
          <div className="pt-6">
            <button
              onClick={loadAnalysis}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Filtrele
            </button>
          </div>
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Toplam Planlanan</div>
          <div className="text-2xl font-bold text-white">{totalPlanned.toFixed(2)}</div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Toplam Fiili</div>
          <div className="text-2xl font-bold text-white">{totalActual.toFixed(2)}</div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Toplam Fire</div>
          <div className="text-2xl font-bold text-orange-400">{totalFire.toFixed(2)}</div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Ortalama Varyans</div>
          <div className={`text-2xl font-bold flex items-center space-x-1 ${
            avgVariancePercentage > 0 ? 'text-red-400' : 'text-green-400'
          }`}>
            {avgVariancePercentage > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            <span>{avgVariancePercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Maliyet Varyansı */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400 mb-1">Toplam Maliyet Varyansı</div>
            <div className={`text-2xl font-bold ${
              totalCostVariance > 0 ? 'text-red-400' : 'text-green-400'
            }`}>
              {totalCostVariance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </div>
          </div>
          {totalCostVariance > 0 && (
            <div className="flex items-center space-x-2 text-orange-400">
              <AlertTriangle className="w-6 h-6" />
              <span className="text-sm">Fire nedeniyle ek maliyet</span>
            </div>
          )}
        </div>
      </div>

      {/* Detaylı Tablo */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Malzeme</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Planlanan</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Fiili</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Fire</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Varyans</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Varyans %</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Maliyet Farkı</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Emir Sayısı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {analysis.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Seçilen tarih aralığında veri bulunamadı
                  </td>
                </tr>
              ) : (
                analysis.map((item) => (
                  <tr key={item.material_id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-white font-medium">{item.material_name}</td>
                    <td className="px-4 py-3 text-right text-white">
                      {item.total_planned.toFixed(2)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {item.total_actual.toFixed(2)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-400 font-semibold">
                      {item.total_fire.toFixed(2)} {item.unit}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      item.total_variance > 0 ? 'text-red-400' : item.total_variance < 0 ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {item.total_variance > 0 ? '+' : ''}{item.total_variance.toFixed(2)} {item.unit}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      item.variance_percentage > 0 ? 'text-red-400' : item.variance_percentage < 0 ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {item.variance_percentage > 0 ? '+' : ''}{item.variance_percentage.toFixed(1)}%
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      item.total_cost_variance > 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {item.total_cost_variance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">{item.order_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


