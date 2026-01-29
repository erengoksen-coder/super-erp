'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Factory, AlertTriangle, TrendingUp, DollarSign, Clock, AlertCircle, BarChart3, ShoppingCart, X, QrCode, Calendar, User, Heart } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { LogoWithBackground } from '@/components/Logo'
import { fetchApi } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'

interface DashboardStats {
  totalStockValue: number
  pendingProduction: number
  criticalStock: number
  productionTrend: Array<{
    date: string
    count: number
    total_quantity: number
  }>
}

type CriticalMaterial = {
  id: string
  code?: string | null
  name: string
  unit: string
  stock_amount: number
  min_stock_level: number
  suggested_quantity?: number
  shortage?: number
  supplier_name?: string | null
}

// Satın Alma Talepleri Bildirim Bileşeni
function PurchaseRequestsNotification() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    loadPurchaseRequests()
    // Her 30 saniyede bir güncelle
    const interval = setInterval(loadPurchaseRequests, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadPurchaseRequests() {
    try {
      // Sadece "draft" ve "ordered" status'undaki talepleri göster
      const data = await fetchApi('/api/purchase-requests')
      // "completed" olmayanları filtrele
      const activeRequests = data.filter((r: any) => 
        (r.status === 'draft' || r.status === 'ordered') && !dismissed.includes(r.id)
      )
      setRequests(activeRequests)
    } catch (error) {
      console.error('Satın alma talepleri yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleDismiss(id: string) {
    setDismissed([...dismissed, id])
    setRequests(requests.filter(r => r.id !== id))
  }

  if (loading || requests.length === 0) return null

  return (
    <div className="mb-6 bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="p-2 bg-yellow-600/20 rounded-lg">
            <ShoppingCart className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1 flex items-center space-x-2">
              <span>Yeni Satın Alma Talepleri</span>
              <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full">
                {requests.length}
              </span>
            </h3>
            <p className="text-gray-300 text-sm mb-2">
              {requests.length} adet bekleyen satın alma talebi bulunmaktadır.
            </p>
            <div className="space-y-1">
              {requests.slice(0, 3).map((req: any) => (
                <div key={req.id} className="text-xs text-gray-400 flex items-center justify-between">
                  <span>
                    <span className="font-medium text-gray-300">{req.request_number}</span>
                    {' - '}
                    {req.material_name} ({req.requested_quantity} {req.material_unit})
                  </span>
                  <button
                    onClick={() => handleDismiss(req.id)}
                    className="ml-2 text-gray-500 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {requests.length > 3 && (
                <div className="text-xs text-gray-400">
                  +{requests.length - 3} talep daha...
                </div>
              )}
            </div>
            <Link
              href="/purchase/critical-stock"
              className="mt-3 inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
            >
              Tümünü Görüntüle
            </Link>
          </div>
        </div>
        <button
          onClick={() => setRequests([])}
          className="text-gray-400 hover:text-white ml-4"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

interface PlanningOrder {
  id: string
  order_number: string
  product_name: string
  product_sku: string
  quantity: number
  current_station: string
  created_at: string
  due_date?: string
  estimated_completion_date?: string
  iskelet_started_at?: string
  iskelet_completed_at?: string
  terzihane_started_at?: string
  terzihane_completed_at?: string
  döseme_started_at?: string
  döseme_completed_at?: string
  montaj_started_at?: string
  montaj_completed_at?: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [planning, setPlanning] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [criticalList, setCriticalList] = useState<CriticalMaterial[]>([])
  const [criticalLoading, setCriticalLoading] = useState(false)
  const [showCriticalList, setShowCriticalList] = useState(false)
  const user = useAuthStore((state) => state.user)
  const userRole = user?.role ?? null

  useEffect(() => {
    loadStats()
    loadPlanning()
    const interval = setInterval(() => {
      loadStats()
      loadPlanning()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadPlanning() {
    try {
      const data = await fetchApi('/api/production/planning')
      setPlanning(data)
    } catch (error) {
      console.error('Error loading planning:', error)
    }
  }

  async function loadStats() {
    try {
      const data = await fetchApi('/api/dashboard/stats')
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadCriticalStock() {
    setCriticalLoading(true)
    try {
      const data = await fetchApi('/api/purchase/critical-stock')
      setCriticalList(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading critical stock:', error)
    } finally {
      setCriticalLoading(false)
    }
  }

  // İstasyon grafik verileri
  const stationChartData = stats?.stationStats?.map(item => ({
    name: item.station_name,
    'Bekleyen Koltuk': item.count,
    'Toplam Adet': item.total_quantity,
  })) || []

  // Grafik verilerini formatla
  const chartData = stats?.productionTrend.map(item => ({
    date: new Date(item.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
    'Üretim Emri': item.count,
    'Üretilen Miktar': item.total_quantity,
  })) || []

  const userName = user?.full_name || user?.username || ''
  const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    // 5 saniye sonra hoş geldin mesajını kapat
    const timer = setTimeout(() => {
      setShowWelcome(false)
    }, 5000)
    
    return () => clearTimeout(timer)
  }, [])

  return (
    <div>
      {/* Hoş Geldin Mesajı */}
      {showWelcome && userName && (
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg border border-blue-500 p-6 relative">
          <button
            onClick={() => setShowWelcome(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center justify-center space-x-3">
              <Heart className="w-8 h-8 md:w-10 md:h-10 text-red-300 fill-red-300 animate-pulse" />
              <span>Hoş Geldin {userName.toUpperCase()}!</span>
              <Heart className="w-8 h-8 md:w-10 md:h-10 text-red-300 fill-red-300 animate-pulse" />
            </h1>
            <p className="text-xl text-white/90">Sisteme başarıyla giriş yaptınız</p>
          </div>
        </div>
      )}

      <div className="mb-4 md:mb-6">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Kontrol Paneli</h1>
            <p className="text-sm md:text-base text-gray-400 mt-1">Sistem özeti ve istatistikler</p>
          </div>
          <LogoWithBackground size="sm" />
        </div>
      </div>

      {/* Satın Alma Talepleri Bildirimi */}
      <PurchaseRequestsNotification />

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        {/* Toplam Stok Değeri */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Toplam Stok Değeri</p>
              <p className="text-2xl font-bold text-white">
                {loading ? '...' : stats?.totalStockValue.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) || '0'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Hammadde birimleri</p>
            </div>
            <div className="p-3 bg-blue-600/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Bekleyen Üretimler */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Bekleyen Üretimler</p>
              <p className="text-2xl font-bold text-white">
                {loading ? '...' : stats?.pendingProduction || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Aktif üretim emri</p>
            </div>
            <div className="p-3 bg-yellow-600/20 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Kritik Stok Uyarıları */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Kritik Stok Uyarıları</p>
              <p className="text-2xl font-bold text-red-400">
                {loading ? '...' : stats?.criticalStock || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Düşük stok seviyesi</p>
            </div>
            <div className="p-3 bg-red-600/20 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>

        {/* Aylık Üretim Verimliliği */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">7 Günlük Üretim</p>
              <p className="text-2xl font-bold text-white">
                {loading ? '...' : stats?.productionTrend.reduce((sum, item) => sum + item.total_quantity, 0) || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Toplam üretilen adet</p>
            </div>
            <div className="p-3 bg-green-600/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Darboğaz Uyarısı */}
      {stats?.bottleneck && stats.bottleneck.count > 10 && (
        <div className="mb-6 bg-red-900/30 border border-red-700 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-300 font-semibold mb-1">⚠️ Darboğaz Tespit Edildi!</h3>
              <p className="text-white text-sm">
                <span className="font-semibold">{stats.bottleneck.station_name}</span> istasyonunda{' '}
                <span className="font-bold text-red-400">{stats.bottleneck.count} koltuk</span> bekliyor.
                Personel kaydırma veya ek kaynak gerekebilir.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grafik ve Hızlı Erişim */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Üretim Trendi Grafiği */}
        <div className="lg:col-span-2 bg-gray-900 rounded-lg border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Son 7 Günlük Üretim Trendi</span>
            </h2>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend 
                  wrapperStyle={{ color: '#9CA3AF', fontSize: '12px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Üretim Emri" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Üretilen Miktar" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Hızlı Erişim */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Hızlı Erişim</h2>
          <div className="space-y-2">
            <Link
              href="/production/new"
              className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center font-medium"
            >
              <Factory className="w-4 h-4 inline mr-2" />
              Yeni Üretim Emri
            </Link>
            <Link
              href="/inventory/materials"
              className="block w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-center font-medium"
            >
              <Package className="w-4 h-4 inline mr-2" />
              Stok Yönetimi
            </Link>
            <button
              onClick={() => {
                setShowCriticalList(true)
                loadCriticalStock()
              }}
              className="block w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-center font-medium"
              type="button"
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Kritik Stoklar
            </button>
            <Link
              href="/barcodes"
              className="block w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-center font-medium"
            >
              <Package className="w-4 h-4 inline mr-2" />
              Barkod Yönetimi
            </Link>
            <Link
              href="/mobile/material-stock"
              className="block w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-center font-medium"
            >
              <QrCode className="w-4 h-4 inline mr-2" />
              Depo Hızlı İşlem
            </Link>
          </div>
        </div>
      </div>

      {/* İstasyon Bazlı Darboğaz Analizi */}
      <div className="mt-6 bg-gray-900 rounded-lg border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
            <Factory className="w-5 h-5" />
            <span>İstasyon Bazlı Darboğaz Analizi</span>
          </h2>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stationChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
              />
              <Legend 
                wrapperStyle={{ color: '#9CA3AF', fontSize: '12px' }}
              />
              <Bar 
                dataKey="Bekleyen Koltuk" 
                fill="#EF4444"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="Toplam Adet" 
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className="text-xs text-gray-400 mt-4 text-center">
          Her istasyonda bekleyen koltuk sayısı. Yüksek değerler darboğazı gösterir.
        </p>
      </div>

      {showCriticalList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>Kritik Stok Listesi</span>
              </h3>
              <button
                onClick={() => setShowCriticalList(false)}
                className="text-gray-400 hover:text-white"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {criticalLoading ? (
              <div className="py-10 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-400">Yükleniyor...</p>
              </div>
            ) : criticalList.length === 0 ? (
              <p className="text-gray-400">Kritik stok bulunamadı.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="text-left py-2 px-3">Kod</th>
                      <th className="text-left py-2 px-3">Malzeme</th>
                      <th className="text-right py-2 px-3">Mevcut</th>
                      <th className="text-right py-2 px-3">Min</th>
                      <th className="text-right py-2 px-3">Eksik</th>
                      <th className="text-right py-2 px-3">Öneri</th>
                      <th className="text-left py-2 px-3">Tedarikçi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalList.map((item) => (
                      <tr key={item.id} className="border-b border-gray-800 text-gray-200">
                        <td className="py-2 px-3 text-gray-300">{item.code || '-'}</td>
                        <td className="py-2 px-3">{item.name}</td>
                        <td className="py-2 px-3 text-right">
                          {item.stock_amount?.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {item.unit}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {item.min_stock_level?.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {item.unit}
                        </td>
                        <td className="py-2 px-3 text-right text-red-400">
                          {(item.shortage ?? 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {item.unit}
                        </td>
                        <td className="py-2 px-3 text-right text-yellow-300">
                          {(item.suggested_quantity ?? 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} {item.unit}
                        </td>
                        <td className="py-2 px-3 text-gray-400">{item.supplier_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Üretim Planlama - Sadece Admin ve Yönetici için */}
      {(userRole === 'admin' || userRole === 'manager') && planning && (
          <div className="mt-6 bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Üretim Planlama</span>
              </h2>
              <span className="text-sm text-gray-400">
                {planning.total_orders} emir, {planning.total_quantity} adet
              </span>
            </div>

            <div className="space-y-4">
              {['iskelet', 'terzihane', 'berjer', 'döseme', 'montaj'].map((station) => {
                const stationOrders = planning.groupedByStation[station] || []
                const stationNames: Record<string, string> = {
                  iskelet: 'İskelet',
                  terzihane: 'Terzihane',
                  berjer: 'Berjer',
                  döseme: 'Döşeme',
                  montaj: 'Montaj',
                }

                if (stationOrders.length === 0) return null

                return (
                  <div key={station} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                      <Factory className="w-4 h-4" />
                      <span>{stationNames[station]}</span>
                      <span className="text-xs text-gray-400">({stationOrders.length} emir)</span>
                    </h3>
                    <div className="space-y-2">
                      {stationOrders.map((order: any) => {
                        const startTime = order[`${station}_started_at`]
                        const completedTime = order[`${station}_completed_at`]
                        const isDelayed = order.due_date && new Date(order.due_date) < new Date()

                        return (
                          <div
                            key={order.id}
                            className={`bg-gray-900 rounded-lg p-3 border ${
                              isDelayed ? 'border-red-500' : 'border-gray-700'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-mono text-sm text-blue-400">{order.order_number}</span>
                                  {isDelayed && (
                                    <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
                                      Gecikmiş
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-semibold text-white text-sm">{order.product_name}</h4>
                                <p className="text-xs text-gray-400">{order.product_sku}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-white">{order.quantity} adet</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-700">
                              <div>
                                <span className="text-gray-500">Oluşturulma:</span>
                                <div className="text-white">
                                  {new Date(order.created_at).toLocaleDateString('tr-TR')}
                                </div>
                              </div>
                              {startTime && (
                                <div>
                                  <span className="text-gray-500">Başlangıç:</span>
                                  <div className="text-white">
                                    {new Date(startTime).toLocaleString('tr-TR')}
                                  </div>
                                </div>
                              )}
                              {order.due_date && (
                                <div>
                                  <span className="text-gray-500">Teslim Tarihi:</span>
                                  <div className={isDelayed ? 'text-red-400' : 'text-white'}>
                                    {new Date(order.due_date).toLocaleDateString('tr-TR')}
                                  </div>
                                </div>
                              )}
                              {completedTime && (
                                <div>
                                  <span className="text-gray-500">Tamamlanma:</span>
                                  <div className="text-green-400">
                                    {new Date(completedTime).toLocaleString('tr-TR')}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
    </div>
  )
}
