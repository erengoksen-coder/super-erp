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
  Activity
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { LogoWithBackground } from '@/components/Logo'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { fetchApi } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import { StatWidget, ChartWidget, ListWidget } from '@/components/widgets/Widget'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
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
  const [planningData, setPlanningData] = useState<{ orders?: PlanningOrder[]; total_cards?: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [criticalList, setCriticalList] = useState<CriticalMaterial[]>([])
  const user = useAuthStore((state) => state.user)

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
      const data = await fetchApi<PlanningOrder[] | { orders?: PlanningOrder[]; total_cards?: number }>('/api/production/planning')
      if (Array.isArray(data)) {
        setPlanning(data)
        setPlanningData(null)
      } else {
        setPlanning(data?.orders ?? [])
        setPlanningData(data as { orders?: PlanningOrder[]; total_cards?: number })
      }
    } catch (error) {
      console.error('Error loading planning:', error)
    }
  }

  async function loadStats() {
    try {
      const data = await fetchApi('/api/dashboard/stats')
      setStats(data as DashboardStats)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Grafik verilerini formatla
  const chartData = stats?.productionTrend?.map(item => ({
    date: new Date(item.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
    'Üretim Emri': item.count,
    'Üretilen Miktar': item.total_quantity,
  })) || []

  const stationChartData = stats?.stationStats?.map(item => ({
    name: item.station_name,
    'Bekleyen': item.count,
    'Toplam Adet': item.total_quantity,
  })) || []

  const userName = user?.full_name || user?.username || ''
  const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false)
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AppDashboardLayout
      title={userName ? `Hoş Geldin, ${userName}` : 'Dashboard'}
      subtitle={new Date().toLocaleDateString('tr-TR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}
      icon={Activity}
      actions={
        <>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Plan
          </Button>
          <Button variant="solid" color="primary" size="sm">
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

      {/* Realtime Overview */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card
            className="cursor-pointer transition-colors hover:bg-gray-50"
            onClick={() => {
              document
                .getElementById('stock-details')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            <CardHeader title="📦 Stok Durumu" />
            <CardBody>
              <StockRealtime />
            </CardBody>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-gray-50"
            onClick={() => {
              document
                .getElementById('production-details')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            <CardHeader title="🏭 Üretim Durumu" />
            <CardBody>
              <ProductionRealtime />
            </CardBody>
          </Card>
        </div>

        <Card
          className="cursor-pointer transition-colors hover:bg-gray-50"
          onClick={() => {
            document
              .getElementById('orders-details')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          <CardHeader title="🛒 Sipariş Takibi" />
          <CardBody>
            <OrdersRealtime />
          </CardBody>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          title="Bu Ay Üretim"
          value={chartData.reduce((sum, item) => sum + item['Üretilen Miktar'], 0)}
          icon={<TrendingUp className="w-6 h-6" />}
          color="success"
          loading={loading}
        />
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
              <Bar dataKey="Bekleyen" fill="#6366f1" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Toplam Adet" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartWidget>
      </div>

      {/* Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ListWidget
          title={`Aktif Üretim Emirleri${planningData?.total_cards ? ` (${planningData.total_cards} kart)` : planning?.length ? ` (${planning.length} emir)` : ''}`}
          items={planning?.slice(0, 5).map((order: PlanningOrder) => ({
            id: order.id,
            title: order.order_number,
            subtitle: `${order.product_name} - ${order.quantity} adet`,
            status: order.current_station,
            statusColor: 'warning'
          })) || []}
          loading={loading}
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

        <Card className="hover-lift">
          <CardHeader 
            title="Hızlı İşlemler"
            subtitle="Sık kullanılan özellikler"
          />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => router.push('/barcodes/scan')}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Barkod Oku
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => router.push('/inventory/materials/new')}
              >
                <Package className="w-4 h-4 mr-2" />
                Stok Ekle
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => router.push('/production/new')}
              >
                <Factory className="w-4 h-4 mr-2" />
                Üretim Başlat
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => router.push('/reports')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Raporlar
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </AppDashboardLayout>
  )
}