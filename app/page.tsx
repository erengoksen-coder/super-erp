'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Package, 
  Factory, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  AlertCircle, 
  BarChart3, 
  ShoppingCart, 
  X, 
  QrCode, 
  Calendar, 
  User, 
  Heart,
  MoreHorizontal,
  Plus,
  Activity,
  FileDown
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { LogoWithBackground } from '@/components/Logo'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { fetchApi } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import { canAccessPath, isAdminRole } from '@/lib/auth/permissions-check'
import { StatWidget, ChartWidget, ListWidget } from '@/components/widgets/Widget'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils/dateFormat'
import { StockRealtime } from '@/app/inventory/components/StockRealtime'
import { ProductionRealtime } from '@/app/production/components/ProductionRealtime'
import { OrdersRealtime } from '@/app/orders/components/OrdersRealtime'

interface DashboardStats {
  totalStockValue: number
  pendingProduction: number
  criticalStock: number
  productionTrend: Array<{
    date: string
    count: number
    total_quantity: number
  }>
  stationStats?: Array<{
    station: string
    station_name: string
    count: number
    total_quantity: number
  }>
}

interface CriticalMaterial {
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
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [planning, setPlanning] = useState<PlanningOrder[]>([])
  const [planningData, setPlanningData] = useState<{
    orders?: PlanningOrder[]
    total_cards?: number
    active_cards?: Array<{ order_id: string; order_number: string; product_name: string; quantity: number; station: string; station_label: string; card_count: number }>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [criticalList, setCriticalList] = useState<CriticalMaterial[]>([])
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    let mounted = true
    const ac = new AbortController()
    const load = () => {
      if (!mounted) return
      loadStats(ac.signal)
      loadPlanning(ac.signal)
      loadCriticalStock(ac.signal)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => {
      mounted = false
      ac.abort()
      clearInterval(interval)
    }
  }, [])

  async function loadCriticalStock(signal?: AbortSignal) {
    try {
      const data = await fetchApi<CriticalMaterial[]>('/api/purchase/critical-stock', { signal })
      if (signal?.aborted) return
      setCriticalList(Array.isArray(data) ? data : [])
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      setCriticalList([])
    }
  }

  async function loadPlanning(signal?: AbortSignal) {
    try {
      const data = await fetchApi<PlanningOrder[] | { orders?: PlanningOrder[]; total_cards?: number; active_cards?: Array<{ order_id: string; order_number: string; product_name: string; quantity: number; station: string; station_label: string; card_count: number }> }>('/api/production/planning', { signal })
      if (signal?.aborted) return
      if (Array.isArray(data)) {
        setPlanning(data)
        setPlanningData(null)
      } else {
        setPlanning((data as any)?.orders ?? [])
        setPlanningData(data as typeof planningData)
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      setPlanning([])
      setPlanningData(null)
    }
  }

  async function loadStats(signal?: AbortSignal) {
    try {
      const data = await fetchApi('/api/dashboard/stats', { signal })
      if (signal?.aborted) return
      setStats(data as DashboardStats)
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
      setStats(null)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }

  // Grafik verilerini formatla
  const chartData = stats?.productionTrend?.map(item => ({
    date: formatDate(item.date),
    'Üretim Emri': item.count,
    'Üretilen Miktar': item.total_quantity,
  })) || []

  const stationChartData = stats?.stationStats?.map((item) => ({
    name: item.station_name,
    stationKey: item.station,
    'Bekleyen': item.count,
    'Toplam Adet': item.total_quantity,
  })) || []

  function getStationRoute(stationKey: string): string {
    switch (stationKey) {
      case 'pending':
        return '/production'
      case 'completed':
        return '/inventory/products'
      case 'sevkiyat':
        return '/shipments'
      case 'iskelet':
      case 'terzihane':
      case 'berjer':
      case 'döseme':
      case 'montaj':
        return `/mobile/workstation/station?station=${encodeURIComponent(stationKey)}`
      default:
        return '/mobile/workstation'
    }
  }

  function handleStationChartClick(payload: { stationKey?: string } | undefined) {
    const key = payload?.stationKey
    if (!key) return
    router.push(getStationRoute(key))
  }

  const userName = user?.full_name || user?.username || ''
  const [showWelcome, setShowWelcome] = useState(true)
  const [exporting, setExporting] = useState(false)
  const permissions = user?.permissions ?? []
  const canViewInventory = isAdminRole(user?.role) || canAccessPath(permissions, '/inventory/materials', 'view') || canAccessPath(permissions, '/inventory/products', 'view')
  const canViewProduction = isAdminRole(user?.role) || canAccessPath(permissions, '/production', 'view')
  const canViewOrders = isAdminRole(user?.role) || canAccessPath(permissions, '/orders', 'view')

  async function handleExportExcel() {
    setExporting(true)
    try {
      const res = await fetch('/api/dashboard/export', { credentials: 'include' })
      if (!res.ok) throw new Error('Export başarısız')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Dashboard_Ozet_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // toast or silent
    } finally {
      setExporting(false)
    }
  }

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    const rafId = requestAnimationFrame(() => {
      timeoutId = setTimeout(() => setShowWelcome(false), 5000)
    })
    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timeoutId!)
    }
  }, [])

  return (
    <AppDashboardLayout
      title={userName ? `Hoş Geldin, ${userName}` : 'Dashboard'}
      subtitle={formatDate(new Date())}
      icon={Activity}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting}>
            <FileDown className="w-4 h-4 mr-2" />
            {exporting ? 'İndiriliyor...' : 'Excel İndir'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push('/production/calendar')}>
            <Calendar className="w-4 h-4 mr-2" />
            Plan
          </Button>
          <Button variant="solid" color="primary" size="sm" onClick={() => router.push('/production/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Üretim
          </Button>
        </>
      }
    >

      {/* Welcome Message */}
      {showWelcome && userName && (
        <Card className="bg-gradient-to-r from-primary to-purple-600 text-white border-0">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Heart className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Harika Bir Gün! 🎉</h2>
                  <p className="text-white/80">
                    Bugün {stats?.pendingProduction || 0} bekleyen üretim emriniz var
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWelcome(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 1. KPI Kartları - En üstte */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatWidget
          title="Stok Değeri"
          value={`₺${stats?.totalStockValue?.toLocaleString('tr-TR') || '0'}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="primary"
          loading={loading}
        />
        <StatWidget
          title="Bekleyen Üretim"
          value={stats?.pendingProduction || 0}
          change={
            stats?.pendingProduction && stats.pendingProduction > 0
              ? { value: '+12%', type: 'increase' }
              : undefined
          }
          icon={<Factory className="w-6 h-6" />}
          color="warning"
          loading={loading}
        />
        <StatWidget
          title="Kritik Stok"
          value={stats?.criticalStock || 0}
          change={
            stats?.criticalStock && stats.criticalStock > 0
              ? { value: '-5%', type: 'decrease' }
              : undefined
          }
          icon={<AlertTriangle className="w-6 h-6" />}
          color="error"
          loading={loading}
        />
        <StatWidget
          title="Son 7 Gün Üretim"
          value={chartData.reduce((sum, item) => sum + item['Üretilen Miktar'], 0)}
          icon={<TrendingUp className="w-6 h-6" />}
          color="success"
          loading={loading}
        />
      </div>

      {/* Hızlı İşlemler - KPI altında, tek satır */}
      <Card className="border border-gray-200/80">
        <CardBody className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-600 mr-2">Hızlı İşlemler:</span>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => router.push('/barcodes/scan')}>
              <QrCode className="w-4 h-4 mr-1.5" />
              Barkod Oku
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => router.push('/inventory/materials/new')}>
              <Package className="w-4 h-4 mr-1.5" />
              Stok Ekle
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => router.push('/production')}>
              <Factory className="w-4 h-4 mr-1.5" />
              Üretim
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => router.push('/reports')}>
              <BarChart3 className="w-4 h-4 mr-1.5" />
              Raporlar
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* 2. Realtime Overview - Stok / Üretim / Sipariş (yetkiye göre gösterilir) */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {canViewInventory && (
            <Card
              className="cursor-pointer transition-colors hover:bg-gray-50 hover:shadow-md"
              onClick={() => router.push('/inventory/materials')}
            >
              <CardHeader title="📦 Stok Durumu" />
              <CardBody>
                <StockRealtime />
              </CardBody>
            </Card>
          )}

          {canViewProduction && (
            <Card
              className="cursor-pointer transition-colors hover:bg-gray-50 hover:shadow-md"
              onClick={() => router.push('/production')}
            >
              <CardHeader title="🏭 Üretim Durumu" />
              <CardBody>
                <ProductionRealtime />
              </CardBody>
            </Card>
          )}
        </div>

        {canViewOrders && (
          <Card
            className="cursor-pointer transition-colors hover:bg-gray-50 hover:shadow-md"
            onClick={() => router.push('/orders')}
          >
            <CardHeader title="🛒 Sipariş Takibi" />
            <CardBody>
              <OrdersRealtime />
            </CardBody>
          </Card>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartWidget
          title="Üretim Trendi"
          subtitle="Son 7 gün"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Üretim Emri" 
                stroke="#6366f1" 
                strokeWidth={2}
                dot={{ fill: '#6366f1', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="Üretilen Miktar" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartWidget>

        <ChartWidget
          title="İstasyon Durumu"
          subtitle="Bekleyen işler"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stationChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar
                dataKey="Bekleyen"
                fill="#6366f1"
                radius={[8, 8, 0, 0]}
                onClick={handleStationChartClick}
                cursor="pointer"
              />
              <Bar
                dataKey="Toplam Adet"
                fill="#10b981"
                radius={[8, 8, 0, 0]}
                onClick={handleStationChartClick}
                cursor="pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartWidget>
      </div>

      {/* Lists Row - Aktif kartlar: 2 adet (Aktif Üretim Emirleri + Kritik Stoklar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-label="2 kart: Aktif Üretim Emirleri ve Kritik Stoklar">
        <ListWidget
          title={`Aktif Üretim Emirleri${planningData?.total_cards != null ? ` (${planningData.total_cards} kart)` : planning?.length ? ` (${planning.length} emir)` : ''}`}
          items={
            (planningData?.active_cards?.length
              ? planningData.active_cards.slice(0, 10).map((ac) => ({
                  id: ac.order_id,
                  title: ac.order_number,
                  subtitle: `${ac.product_name} - ${ac.card_count} adet`,
                  status: ac.station_label,
                  statusColor: 'warning' as const,
                }))
              : planning?.slice(0, 5).map((order: PlanningOrder) => ({
                  id: order.id,
                  title: order.order_number,
                  subtitle: `${order.product_name} - ${order.quantity} adet`,
                  status: order.current_station || '',
                  statusColor: 'warning' as const,
                }))) || []
          }
          loading={loading}
          onItemClick={(item) => router.push(`/production/${item.id}`)}
        />
        <ListWidget
          title="Kritik Stoklar"
          items={criticalList.slice(0, 5).map((material: CriticalMaterial) => ({
            id: material.id,
            title: material.name,
            subtitle: `${material.stock_amount} / ${material.min_stock_level} ${material.unit}`,
            status: 'Kritik',
            statusColor: 'error'
          })) || []}
          loading={loading}
          empty="Kritik stok bulunmamaktadır"
        />
      </div>
    </AppDashboardLayout>
  )
}