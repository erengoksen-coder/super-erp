'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { Area, AreaChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { LogoWithBackground } from '@/components/Logo'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { fetchApi } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import { canAccessPath, isAdminRole } from '@/lib/auth/permissions-check'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils/dateFormat'
import { StockRealtime } from '@/app/inventory/components/StockRealtime'
import { ProductionRealtime } from '@/app/production/components/ProductionRealtime'
import { OrdersRealtime } from '@/app/orders/components/OrdersRealtime'
import { AgingWidget } from '@/app/dashboard/AgingWidget'
import { AIPredictionsWidget } from '@/app/dashboard/AIPredictionsWidget'
import { AgiAnalyticsHUD } from '@/components/dashboard/AgiAnalyticsHUD'
import { AgiPulse } from '@/components/dashboard/AgiPulse'
import { ZenithCard, ZenithHeader } from '@/components/ui/ZenithCard'
import { cn } from '@/lib/cn'

interface DashboardStats {
  totalStockValue: number
  pendingProduction: number
  criticalStock: number
  salesThisMonth: number
  salesLastMonth: number
  totalReceivables: number
  todayOrders: number
  todayInvoices: number
  todayShipments: number
  pendingApprovalCount: number
  deliveriesThisWeek: number
  overdueOrders: number
  overdueChecksNotes: number
  pendingPurchaseRequests: number
  readyForShipment: number
  crmPipelineValue: number
  recentInventoryMovements: number
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
  salesTrend?: Array<{
    month: string
    total: number
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'kpis' | 'charts'>('kpis')
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    let mounted = true
    const ac = new AbortController()
    const load = () => {
      if (!mounted) return
      loadStats(ac.signal)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => {
      mounted = false
      ac.abort()
      clearInterval(interval)
    }
  }, [])

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

  const chartData = useMemo(() => stats?.productionTrend?.map(item => ({
    date: formatDate(item.date),
    'Emir': item.count,
    'Miktar': item.total_quantity,
  })) || [], [stats])

  const userName = user?.full_name || user?.username || 'Misafir'
  const [exporting, setExporting] = useState(false)
  const permissions = user?.permissions ?? []
  
  const canViewInventory = isAdminRole(user?.role) || canAccessPath(permissions, '/inventory/materials', 'view')
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
    } finally {
      setExporting(false)
    }
  }

  return (
    <AppDashboardLayout
      title={userName ? `Hoş Geldin, ${userName}` : 'Kontrol Paneli'}
      subtitle={formatDate(new Date())}
      icon={Activity}
      className="animate-reveal"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="soft" color="secondary" size="sm" onClick={handleExportExcel} disabled={exporting} className="hidden md:flex rounded-xl">
            <FileDown className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="soft" color="secondary" size="sm" onClick={() => router.push('/production/calendar')} className="hidden md:flex rounded-xl">
            <Calendar className="w-4 h-4 mr-2" />
            Takvim
          </Button>
          <Button variant="solid" color="primary" size="sm" onClick={() => router.push('/production/new')} className="rounded-xl shadow-lg shadow-primary/25">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Üretim
          </Button>
        </div>
      }
    >
      <div className="space-y-8 pb-12">
        {/* Modern Welcome Banner */}
        {/* Modern Welcome Banner - Zenith */}
        <ZenithCard glow className="relative overflow-hidden p-10 border-white/5 animate-sweep">
           <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full -mr-40 -mt-40 blur-[120px] animate-pulse" />
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="soft" color="primary" className="font-black tracking-widest text-[9px] px-4 py-1.5 rounded-full border border-primary/20">ZENITH BUSINESS OS v4.1</Badge>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest">Sistem Aktif</span>
                    </div>
                  </div>
                  <h2 className="text-5xl font-black text-white tracking-tight leading-tight">
                    Yeni Nesil <span className="text-primary glow-primary px-2">Akıllı</span> <br/>
                    Üretim Yönetimi.
                  </h2>
                 <p className="text-white/40 font-medium max-w-xl leading-relaxed">Bugün için planlanan 12 sevkiyat ve 5 kritik stok uyarısı mevcut. Üretim bandı %85 verimlilikle çalışıyor. Agi-Copilot analizleri hazır.</p>
              </div>
              <div className="flex items-center gap-6">
                 <div className="text-right hidden sm:block">
                    <p className="text-4xl font-black text-white tracking-tighter">{stats?.todayOrders || 0}</p>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-1">Bugün Sipariş</p>
                 </div>
                 <div className="w-16 h-16 rounded-[2rem] bg-primary text-white flex items-center justify-center glow-primary group hover:scale-110 transition-all cursor-pointer">
                    <ArrowRight className="w-8 h-8" />
                 </div>
              </div>
           </div>
        </ZenithCard>


        {/* Tab Navigation - Platinum Style */}
        <div className="flex justify-center animate-reveal" style={{ animationDelay: '100ms' }}>
           <div className="inline-flex p-1.5 glass rounded-2xl border border-white/5 shadow-2xl">
              <button
                onClick={() => setActiveTab('kpis')}
                className={cn(
                  "flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-500",
                  activeTab === 'kpis' ? "bg-primary text-white shadow-glow" : "text-foreground/40 hover:text-foreground/60 hover:bg-white/5"
                )}
              >
                <Activity className="w-4 h-4" />
                Operasyonel Özet
              </button>
              <button
                onClick={() => setActiveTab('charts')}
                className={cn(
                  "flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-500",
                  activeTab === 'charts' ? "bg-primary text-white shadow-glow" : "text-foreground/40 hover:text-foreground/60 hover:bg-white/5"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                Analiz & Trendler
              </button>
           </div>
        </div>

        {activeTab === 'kpis' && (
          <div className="space-y-8 animate-reveal" style={{ animationDelay: '200ms' }}>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Bekleyen Tahsilat', value: `₺${stats?.totalReceivables?.toLocaleString('tr-TR') || '0'}`, icon: Wallet, color: 'primary', link: '/finance/receivables' },
                { title: 'Kritik Stok', value: stats?.criticalStock || 0, icon: AlertTriangle, color: 'red', link: '/purchase/critical-stock' },
                { title: 'Bu Ay Ciro', value: `₺${stats?.salesThisMonth?.toLocaleString('tr-TR') || '0'}`, icon: BarChart3, color: 'emerald', link: '/finance/invoices' },
                { title: 'Bekleyen Üretim', value: stats?.pendingProduction || 0, icon: Factory, color: 'orange', link: '/production/orders' }
              ].map((item, idx) => (
                <ZenithCard 
                   key={idx} 
                   glow
                   className="group cursor-pointer border-white/5 hover:border-primary/30 transition-all relative overflow-hidden"
                   onClick={() => router.push(item.link)}
                >
                   <div className="flex flex-col items-center justify-center text-center relative z-10 py-2">
                      <div className={cn("p-4 rounded-[1.5rem] mb-5 transition-all duration-500 group-hover:scale-110 border", 
                        item.color === 'primary' ? 'bg-primary/10 border-primary/20 text-primary' :
                        item.color === 'red' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                        item.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                        'bg-orange-500/10 border-orange-500/20 text-orange-500'
                      )}>
                         <item.icon className="w-6 h-6" />
                      </div>
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">{item.title}</p>
                      <h3 className="text-3xl font-black text-white tracking-tighter italic">{loading ? '...' : item.value}</h3>
                      
                      {/* Decorative Background Icon */}
                      <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.1] transition-all duration-700 pointer-events-none text-white">
                         <item.icon className="h-28 w-28 rotate-12" />
                      </div>
                   </div>
                </ZenithCard>
              ))}

            </div>

            {/* Operational Details Strip - Zenith */}
            <ZenithCard className="p-0 overflow-hidden border-white/5 bg-white/[0.02]">
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 divide-x divide-white/5">
                  {[
                    { label: 'Bugün Fatura', val: stats?.todayInvoices, color: 'text-white/60' },
                    { label: 'Haftalık Teslim', val: stats?.deliveriesThisWeek, color: 'text-blue-400' },
                    { label: 'Geciken Sipariş', val: stats?.overdueOrders, color: 'text-red-400 font-black' },
                    { label: 'Vadesi Geçen', val: stats?.overdueChecksNotes, color: 'text-red-400 font-black' },
                    { label: 'S.Alma Talebi', val: stats?.pendingPurchaseRequests, color: 'text-amber-400' },
                    { label: 'Sevk Bekleyen', val: stats?.readyForShipment, color: 'text-emerald-400' },
                    { label: 'Onay Bekleyen', val: stats?.pendingApprovalCount, color: 'text-purple-400' }
                  ].map((s, i) => (
                     <div key={i} className="py-8 px-4 text-center space-y-1 group hover:bg-white/5 transition-all cursor-pointer">
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{s.label}</p>
                        <p className={cn("text-2xl font-black transition-all group-hover:scale-110 tracking-tighter", s.color)}>{loading ? '—' : (s.val || 0)}</p>
                     </div>
                  ))}
               </div>
            </ZenithCard>

            {/* Quick Access Bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 animate-reveal" style={{ animationDelay: '300ms' }}>
               {[
                 { label: 'Barkod Tara', icon: QrCode, link: '/barcodes/scan', color: 'text-blue-400' },
                 { label: 'Stok Girişi', icon: Package, link: '/inventory/materials/new', color: 'text-emerald-400' },
                 { label: 'Üretim Takibi', icon: Factory, link: '/production', color: 'text-amber-400' },
                 { label: 'Mali Raporlar', icon: FileText, link: '/finance', color: 'text-purple-400' },
                 { label: 'Lojistik', icon: Truck, link: '/shipments', color: 'text-primary' }
               ].map((q, i) => (
                 <Button 
                   key={i} 
                   variant="glass" 
                   onClick={() => router.push(q.link)}
                   className="h-12 px-6 rounded-2xl group border border-white/5 hover:border-primary/20 transition-all font-bold tracking-tight"
                 >
                    <q.icon className={cn("w-4 h-4 mr-2 group-hover:scale-125 transition-transform", q.color)} />
                    {q.label}
                 </Button>
               ))}
            </div>

            {/* Dashboard Content Grid - Platinum Horizon */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-reveal" style={{ animationDelay: '400ms' }}>
               {/* Main Operational Column */}
               <div className="lg:col-span-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {canViewInventory && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                          <Warehouse className="w-5 h-5 text-primary shadow-glow" />
                          <h3 className="text-sm font-black text-foreground/80 uppercase tracking-widest">Depo Operasyonları</h3>
                        </div>
                        <StockRealtime />
                      </div>
                    )}
                    {canViewProduction && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                          <ClipboardCheck className="w-5 h-5 text-amber-500 shadow-[0_0_10px_orange]" />
                          <h3 className="text-sm font-black text-foreground/80 uppercase tracking-widest">Üretim Bant Durumu</h3>
                        </div>
                        <ProductionRealtime />
                      </div>
                    )}
                  </div>
                  {canViewOrders && (
                    <div className="space-y-4">
                       <div className="flex items-center gap-3 px-2">
                         <ShoppingCart className="w-5 h-5 text-emerald-500 shadow-[0_0_10px_emerald]" />
                         <h3 className="text-sm font-black text-foreground/80 uppercase tracking-widest">Canlı Sipariş Trafiği</h3>
                       </div>
                       <OrdersRealtime />
                    </div>
                  )}
               </div>

               {/* Side Status Column (Agi-Pulse) */}
               <div className="lg:col-span-4 space-y-6">
                  <div className="flex items-center gap-3 px-2">
                    <Activity className="w-5 h-5 text-blue-400 animate-pulse shadow-glow" />
                    <h3 className="text-sm font-black text-foreground/80 uppercase tracking-widest">Sistem Pulse</h3>
                  </div>

                  {/* CRM & Envanter Pulse Widgets */}
                  <div className="space-y-4">
                    <Card 
                      variant="glass" 
                      className="border-primary/10 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer group" 
                      onClick={() => router.push('/crm/pipeline')}
                    >
                      <CardBody className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                          <div>
                            <p className="text-[9px] font-black text-foreground/30 uppercase tracking-wider">CRM Boru Hattı</p>
                            <p className="text-lg font-black text-foreground">₺{stats?.crmPipelineValue?.toLocaleString('tr-TR') || '0'}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-foreground/20" />
                      </CardBody>
                    </Card>

                    <Card 
                      variant="glass" 
                      className="border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all cursor-pointer group" 
                      onClick={() => router.push('/inventory/barcodes')}
                    >
                      <CardBody className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                          <div>
                            <p className="text-[9px] font-black text-foreground/30 uppercase tracking-wider">Son 24s Hareket</p>
                            <p className="text-lg font-black text-foreground">{stats?.recentInventoryMovements || 0} İşlem</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-foreground/20" />
                      </CardBody>
                    </Card>
                  </div>

                  <AgiPulse />
               </div>
            </div>
          </div>
        )}

        {activeTab === 'charts' && (
          <AgiAnalyticsHUD stats={stats} chartData={chartData} loading={loading} />
        )}
      </div>

      {/* Corporate Branding Footer */}
      <div className="flex flex-col items-center justify-center gap-6 opacity-20 py-24 animate-reveal" style={{ animationDelay: '600ms' }}>
         <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
         <div className="flex items-center gap-10 italic font-black text-[9px] uppercase tracking-[1em]">
          <span>Livasofa ERP v4.1</span>
          <div className="w-2 h-2 bg-primary rounded-full animate-glow" />
          <span>Mobilya Üretim Çözümleri</span>
         </div>
      </div>
    </AppDashboardLayout>
  )
}