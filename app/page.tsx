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
  FileDown,
  Wallet,
  FileText,
  Warehouse,
  ClipboardCheck,
  Truck
} from 'lucide-react'
import { Area, AreaChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
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
import { AgingWidget } from '@/app/dashboard/AgingWidget'
import { AIPredictionsWidget } from '@/app/dashboard/AIPredictionsWidget'

interface DashboardStats {
  totalStockValue: number
  pendingProduction: number
  criticalStock: number
  deliveriesThisWeek?: number
  overdueOrders?: number
  overdueChecksNotes?: number
  salesThisMonth?: number
  salesLastMonth?: number
  totalReceivables?: number
  todayOrders?: number
  todayInvoices?: number
  todayShipments?: number
  readyForShipment?: number
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
  aging?: {
    range_0_30: number
    range_30_60: number
    range_60_90: number
    range_90_plus: number
  }
  salesTrend?: Array<{ month: string; total: number }>
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
  const canExport = user?.can_export !== 0
  const [isClient, setIsClient] = useState(false)

  // Sürükle-bırak için bölümler
  const defaultSections = ['critical', 'quick-access', 'summary', 'charts']
  const [sectionOrder, setSectionOrder] = useState<string[]>(defaultSections)

  useEffect(() => {
    setIsClient(true)
    const savedOrder = localStorage.getItem('erp_dashboard_layout')
    if (savedOrder) {
      try { setSectionOrder(JSON.parse(savedOrder)) } catch { }
    }
  }, [])

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    const items = Array.from(sectionOrder)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    setSectionOrder(items)
    localStorage.setItem('erp_dashboard_layout', JSON.stringify(items))
  }

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
      if (!res.ok) throw new Error('Dışa aktarma başarısız')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Dashboard_Ozet_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      // Hata durumunda sessiz veya toast
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

  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'İyi Geceler' : hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi Günler' : 'İyi Akşamlar'

  return (
    <AppDashboardLayout
      title={userName ? `${greeting}, ${userName}` : 'Dashboard'}
      subtitle={formatDate(new Date())}
      icon={Activity}
      actions={
        <>
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/50 shadow-md shadow-emerald-500/10 transition-all font-medium"
              onClick={handleExportExcel}
              disabled={exporting}
            >
              <FileDown className="w-4 h-4 mr-2" />
              {exporting ? 'İndiriliyor...' : 'Excel İndir'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-500/50 shadow-md shadow-purple-500/10 transition-all font-medium"
            onClick={() => router.push('/production/calendar')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 hover:border-blue-500/50 shadow-md shadow-blue-500/10 transition-all font-medium"
            onClick={() => router.push('/production/new')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Üretim
          </Button>
        </>
      }
    >

      {/* DAİMA ÜSTTE KALAN KISIMLAR */}
      {showWelcome && userName && (
        <Card variant="elevated" className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-md border border-blue-500/30">
          <CardBody className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-500/20 rounded-xl shadow-inner">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white">Sisteme Hoş Geldiniz!</h2>
                  <p className="text-sm md:text-base text-blue-100/80 mt-1">
                    Bugün aktif {stats?.pendingProduction || 0} üretim emri, {(stats?.todayOrders ?? 0)} yeni sipariş ve {stats?.readyForShipment || 0} sevkiyat bekleyen ürününüz var.
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowWelcome(false)} className="text-white hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 🚀 HIZLI YENİ İŞLEM BUTONLARI */}
      <div className="flex flex-wrap gap-4 mt-4 mb-2">
        <Button
          variant="outline"
          className="rounded-xl px-6 py-2.5 bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/50 shadow-lg shadow-amber-500/10 transition-all hover:-translate-y-1 font-semibold tracking-wide"
          onClick={() => router.push('/orders?new=1')}
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          Yeni Sipariş
        </Button>
        <Button
          variant="outline"
          className="rounded-xl px-6 py-2.5 bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 hover:border-blue-500/50 shadow-lg shadow-blue-500/10 transition-all hover:-translate-y-1 font-semibold tracking-wide"
          onClick={() => router.push('/invoices/new')}
        >
          <FileText className="w-5 h-5 mr-2" />
          Fatura Kes
        </Button>
        <Button
          variant="outline"
          className="rounded-xl px-6 py-2.5 bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 hover:border-indigo-500/50 shadow-lg shadow-indigo-500/10 transition-all hover:-translate-y-1 font-semibold tracking-wide"
          onClick={() => router.push('/waybills/new')}
        >
          <ClipboardCheck className="w-5 h-5 mr-2" />
          İrsaliye Oluştur
        </Button>
        <Button
          variant="outline"
          className="rounded-xl px-6 py-2.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/50 shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-1 font-semibold tracking-wide"
          onClick={() => router.push('/checks-notes')}
        >
          <DollarSign className="w-5 h-5 mr-2" />
          Çek / Senet Ekle
        </Button>
      </div>

      {isClient && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="dashboard-sections">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6 mt-4 pb-12">
                {sectionOrder.map((sectionId, index) => (
                  <Draggable key={sectionId} draggableId={sectionId} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`transition-all ${snapshot.isDragging ? 'ring-2 ring-blue-500 shadow-2xl rounded-xl opacity-90 scale-[1.02] bg-slate-900/80 z-50' : ''}`}
                      >
                        {/* Drag Handle (Görünmez tutma alanı veya küçük bir ikon eklenebilir. Şimdilik bölüm başlıkları drag handle olacak) */}
                        <div {...provided.dragHandleProps} className="group relative">
                          <div className={`absolute -left-3 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-0.5 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-800 ${snapshot.isDragging ? 'opacity-100 cursor-grabbing' : ''}`}>
                            <div className="w-1 h-1 bg-slate-500 rounded-full" />
                            <div className="w-1 h-1 bg-slate-500 rounded-full" />
                            <div className="w-1 h-1 bg-slate-500 rounded-full" />
                            <div className="w-1 h-1 bg-slate-500 rounded-full" />
                          </div>

                          {sectionId === 'critical' && (
                            <div className="space-y-3 pl-2">
                              <h2 className="text-sm font-semibold uppercase tracking-wider text-rose-500/80 px-1 select-none">Kritik & Acil</h2>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="cursor-pointer" onClick={() => router.push('/purchase/critical-stock')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && router.push('/purchase/critical-stock')}>
                                  <StatWidget
                                    title="Kritik Stok"
                                    value={stats?.criticalStock || 0}
                                    icon={<AlertTriangle className="w-6 h-6" />}
                                    color="error"
                                    loading={loading}
                                    className="hover:-translate-y-1"
                                  />
                                </div>
                                <div className="cursor-pointer" onClick={() => router.push('/checks-notes?overdue=1')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && router.push('/checks-notes?overdue=1')}>
                                  <StatWidget
                                    title="Vadesi Geçmiş Ödemeler"
                                    value={stats?.overdueChecksNotes ?? 0}
                                    icon={<FileText className="w-6 h-6" />}
                                    color="error"
                                    loading={loading}
                                    className="hover:-translate-y-1"
                                  />
                                </div>
                                <div className="cursor-pointer" onClick={() => router.push('/orders')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && router.push('/orders')}>
                                  <StatWidget
                                    title="Gecikmiş Siparişler"
                                    value={stats?.overdueOrders ?? 0}
                                    icon={<AlertCircle className="w-6 h-6" />}
                                    color="warning"
                                    loading={loading}
                                    className="hover:-translate-y-1"
                                  />
                                </div>
                                <div className="cursor-pointer" onClick={() => router.push('/accounts?has_debt=1')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && router.push('/accounts?has_debt=1')}>
                                  <StatWidget
                                    title="Bekleyen Tahsilat (Toplam)"
                                    value={`₺${(stats?.totalReceivables ?? 0).toLocaleString('tr-TR')}`}
                                    icon={<Wallet className="w-6 h-6" />}
                                    color="warning"
                                    loading={loading}
                                    className="hover:-translate-y-1"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {sectionId === 'quick-access' && (
                            <div className="space-y-3 pl-2">
                              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 px-1 select-none">Modüller & Hızlı İşlemler</h2>
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                                {[
                                  { label: 'Siparişler', icon: ShoppingCart, href: '/orders', color: 'from-amber-600/20 to-amber-900/10', text: 'text-amber-400', border: 'border-amber-800/50 hover:border-amber-500/80' },
                                  { label: 'Faturalar', icon: FileText, href: '/invoices', color: 'from-blue-600/20 to-blue-900/10', text: 'text-blue-400', border: 'border-blue-800/50 hover:border-blue-500/80' },
                                  { label: 'İrsaliyeler', icon: ClipboardCheck, href: '/waybills', color: 'from-indigo-600/20 to-indigo-900/10', text: 'text-indigo-400', border: 'border-indigo-800/50 hover:border-indigo-500/80' },
                                  { label: 'Çek / Senet', icon: DollarSign, href: '/checks-notes', color: 'from-emerald-600/20 to-emerald-900/10', text: 'text-emerald-400', border: 'border-emerald-800/50 hover:border-emerald-500/80' },
                                  { label: 'Stok', icon: Package, href: '/inventory/materials', color: 'from-cyan-600/20 to-cyan-900/10', text: 'text-cyan-400', border: 'border-cyan-800/50 hover:border-cyan-500/80' },
                                  { label: 'Üretim', icon: Factory, href: '/production', color: 'from-violet-600/20 to-violet-900/10', text: 'text-violet-400', border: 'border-violet-800/50 hover:border-violet-500/80' },
                                  { label: 'Üretim Paneli', icon: Activity, href: '/production/dashboard', color: 'from-fuchsia-600/20 to-fuchsia-900/10', text: 'text-fuchsia-400', border: 'border-fuchsia-800/50 hover:border-fuchsia-500/80' },
                                  { label: 'Cari Hesaplar', icon: User, href: '/accounts', color: 'from-slate-600/30 to-slate-900/10', text: 'text-slate-300', border: 'border-slate-700/50 hover:border-slate-400/80' },
                                  { label: 'Raporlar', icon: BarChart3, href: '/reports', color: 'from-pink-600/20 to-pink-900/10', text: 'text-pink-400', border: 'border-pink-800/50 hover:border-pink-500/80' },
                                ].map((item, idx) => (
                                  <div key={idx} className="cursor-pointer" onClick={() => router.push(item.href)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && router.push(item.href)}>
                                    <Card variant="elevated" hover className={`h-full bg-gradient-to-br ${item.color} ${item.border} transition-all p-3 flex flex-col items-center justify-center gap-2 text-center group`}>
                                      <item.icon className={`w-6 h-6 ${item.text} group-hover:scale-110 transition-transform`} />
                                      <span className="font-medium text-slate-200 text-xs sm:text-sm">{item.label}</span>
                                    </Card>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {sectionId === 'summary' && (
                            <div className="space-y-3 pl-2 mt-2">
                              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 px-1 select-none">Performans Özeti</h2>
                              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                <StatWidget
                                  title="Bu Ay Ciro"
                                  value={`₺${(stats?.salesThisMonth ?? 0).toLocaleString('tr-TR')}`}
                                  change={
                                    stats?.salesLastMonth != null && stats.salesLastMonth > 0 && stats.salesThisMonth != null
                                      ? (() => {
                                        const pct = ((stats.salesThisMonth - stats.salesLastMonth) / stats.salesLastMonth) * 100
                                        return { value: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, type: pct >= 0 ? 'increase' : 'decrease' as any }
                                      })()
                                      : undefined
                                  }
                                  icon={<TrendingUp className="w-6 h-6" />}
                                  color="success"
                                  loading={loading}
                                />
                                <StatWidget
                                  title="Stok Değeri"
                                  value={`₺${stats?.totalStockValue?.toLocaleString('tr-TR') || '0'}`}
                                  icon={<Package className="w-6 h-6" />}
                                  color="primary"
                                  loading={loading}
                                />
                                <StatWidget
                                  title="Bekleyen Üretim"
                                  value={stats?.pendingProduction || 0}
                                  icon={<Factory className="w-6 h-6" />}
                                  color="primary"
                                  loading={loading}
                                />
                                <StatWidget
                                  title="Bu Hafta Teslim"
                                  value={stats?.deliveriesThisWeek ?? 0}
                                  icon={<Calendar className="w-6 h-6" />}
                                  color="primary"
                                  loading={loading}
                                />
                                <div className="cursor-pointer" onClick={() => router.push('/production/dashboard')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && router.push('/production/dashboard')}>
                                  <StatWidget
                                    title="Sevkiyat Bekleyen"
                                    value={stats?.readyForShipment ?? 0}
                                    icon={<Truck className="w-6 h-6" />}
                                    color="success"
                                    loading={loading}
                                    className="hover:-translate-y-1"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {sectionId === 'charts' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pl-2 mt-2">
                              {/* Sol Sütun: Finans */}
                              <div className="space-y-6">
                                <ChartWidget title="Aylık Ciro Trendi" subtitle="Son 6 ay performansı" loading={loading}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats?.salesTrend?.map(s => ({ ay: s.month, Ciro: s.total })) || []}>
                                      <defs>
                                        <linearGradient id="colorCiro" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                      <XAxis dataKey="ay" stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} dy={10} />
                                      <YAxis stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v: number) => `₺${(v / 1000).toFixed(0)}K`} />
                                      <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(51, 65, 85, 0.5)', borderRadius: '16px', color: '#f1f5f9', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(59,130,246,0.3)' }}
                                        itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                                        formatter={(value: number) => [`₺${value.toLocaleString('tr-TR')}`, 'Ciro']}
                                        cursor={{ fill: 'rgba(51, 65, 85, 0.2)', opacity: 1 }}
                                      />
                                      <Bar dataKey="Ciro" fill="url(#colorCiro)" radius={[8, 8, 0, 0]} barSize={36} animationDuration={1500} animationEasing="ease-out" />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </ChartWidget>
                                <AgingWidget />
                                <AIPredictionsWidget />
                              </div>

                              {/* Sağ Sütun: Üretim/Operasyon */}
                              <div className="space-y-6">
                                <ChartWidget title="Üretim Trendi" subtitle="Son 7 gün emri ve üretim miktarı" loading={loading}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id="colorOemri" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorUretimMiktar" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
                                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} dy={10} />
                                      <YAxis stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} />
                                      <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(51, 65, 85, 0.5)', borderRadius: '16px', color: '#f1f5f9', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}
                                      />
                                      <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                      <Area type="monotone" dataKey="Üretim Emri" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorOemri)" activeDot={{ r: 8, strokeWidth: 0, fill: '#c4b5fd', style: { filter: 'drop-shadow(0px 0px 5px rgba(139,92,246,0.8))' } }} />
                                      <Area type="monotone" dataKey="Üretilen Miktar" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorUretimMiktar)" activeDot={{ r: 8, strokeWidth: 0, fill: '#6ee7b7', style: { filter: 'drop-shadow(0px 0px 5px rgba(16,185,129,0.8))' } }} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </ChartWidget>

                                <div className="grid grid-cols-1 gap-6">
                                  {canViewProduction && (
                                    <Card className="hover:shadow-lg transition-shadow bg-slate-800/50 border-slate-700">
                                      <CardHeader title="🏭 Aktif Üretim Emirleri" className="border-b border-slate-700/50 pb-3" />
                                      <CardBody className="pt-4">
                                        <ProductionRealtime />
                                      </CardBody>
                                    </Card>
                                  )}
                                  {canViewOrders && (
                                    <Card className="hover:shadow-lg transition-shadow bg-slate-800/50 border-slate-700">
                                      <CardHeader title="🛒 Son Siparişler" className="border-b border-slate-700/50 pb-3" />
                                      <CardBody className="pt-4">
                                        <OrdersRealtime />
                                      </CardBody>
                                    </Card>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </AppDashboardLayout>
  )
}