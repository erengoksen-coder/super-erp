'use client'

import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Package, Factory } from 'lucide-react'

interface ProductionOrder {
  id: string
  order_number: string
  product_name: string
  sku: string
  quantity: number
  material_cost: number
  labor_cost: number
  total_cost: number
  selling_price: number
  profit: number
  created_at: string
}

export default function CostAnalysisPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalCost: 0,
    totalRevenue: 0,
    totalProfit: 0,
    averageProfit: 0,
    profitMargin: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const response = await fetch('/api/production')
      if (!response.ok) throw new Error('Veri yüklenemedi')
      const data = await response.json()
      setOrders(data)

      // Özet hesaplama
      const totalCost = data.reduce((sum: number, o: ProductionOrder) => sum + (o.total_cost || 0), 0)
      const totalRevenue = data.reduce((sum: number, o: ProductionOrder) => sum + (o.selling_price || 0), 0)
      const totalProfit = data.reduce((sum: number, o: ProductionOrder) => sum + (o.profit || 0), 0)
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
      const averageProfit = data.length > 0 ? totalProfit / data.length : 0

      setSummary({
        totalCost,
        totalRevenue,
        totalProfit,
        averageProfit,
        profitMargin,
      })
    } catch (error) {
      console.error('Veri yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount)
  }

  function formatPercent(value: number): string {
    return `${value.toFixed(2)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Maliyet Analizi</h1>
        <p className="text-gray-400 mt-1">Üretim maliyetleri ve kar marjı analizi</p>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Toplam Maliyet</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(summary.totalCost)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Toplam Gelir</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatCurrency(summary.totalRevenue)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Toplam Kar</p>
              <p className={`text-2xl font-bold mt-1 ${
                summary.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatCurrency(summary.totalProfit)}
              </p>
            </div>
            {summary.totalProfit >= 0 ? (
              <TrendingUp className="w-8 h-8 text-green-400" />
            ) : (
              <TrendingDown className="w-8 h-8 text-red-400" />
            )}
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Kar Marjı</p>
              <p className={`text-2xl font-bold mt-1 ${
                summary.profitMargin >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatPercent(summary.profitMargin)}
              </p>
            </div>
            <Package className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Ortalama Kar</p>
              <p className={`text-2xl font-bold mt-1 ${
                summary.averageProfit >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatCurrency(summary.averageProfit)}
              </p>
            </div>
            <Factory className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Detaylı Liste */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Üretim Emirleri - Maliyet Detayı</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Emir No
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                  Ürün
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Miktar
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Malzeme Maliyeti
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  İşçilik
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Toplam Maliyet
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Satış Fiyatı
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Kar/Zarar
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                  Kar %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {orders.map((order) => {
                const profitPercent = order.total_cost > 0 
                  ? ((order.profit || 0) / order.total_cost) * 100 
                  : 0
                const unitCost = order.quantity > 0 ? (order.total_cost || 0) / order.quantity : 0
                const unitPrice = order.quantity > 0 ? (order.selling_price || 0) / order.quantity : 0
                const unitProfit = unitPrice - unitCost

                return (
                  <tr key={order.id} className="hover:bg-gray-800 transition">
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      <div>
                        <div className="font-medium">{order.product_name}</div>
                        <div className="text-gray-400 text-xs">{order.sku}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right">
                      {order.quantity} adet
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right">
                      {formatCurrency(order.material_cost || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right">
                      {formatCurrency(order.labor_cost || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right font-medium">
                      {formatCurrency(order.total_cost || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right">
                      {formatCurrency(order.selling_price || 0)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${
                      (order.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(order.profit || 0)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${
                      profitPercent >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPercent(profitPercent)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


