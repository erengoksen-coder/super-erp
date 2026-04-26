'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { 
  LayoutDashboard, Package, Factory, ShoppingCart, BarChart3, 
  Users, Wrench, Truck, FileText, Wallet, Warehouse, 
  ClipboardCheck, TrendingUp, TrendingDown, DollarSign, 
  Clock, Settings2, Eye, EyeOff, X, Zap, Activity
} from 'lucide-react'

import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { ZenithCard } from '@/components/ui/ZenithCard'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { NewFeatureHighlight } from '@/components/dashboard/NewFeatureHighlight'
import { useUIStore } from '@/lib/store/uiStore'

// Performance: Lazy-loading heavy dashboard components
const DashboardSummary = dynamic(() => import('@/app/dashboard/DashboardSummary').then(mod => mod.DashboardSummary), { ssr: false, loading: () => <div className="h-40 bg-slate-800/50 animate-pulse rounded-xl" /> })
const CriticalStockAlert = dynamic(() => import('@/app/dashboard/CriticalStockAlert').then(mod => mod.CriticalStockAlert), { ssr: false })
const PendingApprovalAlert = dynamic(() => import('@/app/dashboard/PendingApprovalAlert').then(mod => mod.PendingApprovalAlert), { ssr: false })
const OverdueOrdersAlert = dynamic(() => import('@/app/dashboard/OverdueOrdersAlert').then(mod => mod.OverdueOrdersAlert), { ssr: false })
const RecentViews = dynamic(() => import('@/app/dashboard/RecentViews').then(mod => mod.RecentViews), { ssr: false })
const RecentActivity = dynamic(() => import('@/app/dashboard/RecentActivity').then(mod => mod.RecentActivity), { ssr: false })
const RevenueChart = dynamic(() => import('@/app/dashboard/RevenueChart').then(mod => mod.RevenueChart), { ssr: false, loading: () => <div className="h-64 bg-slate-800/50 animate-pulse rounded-xl" /> })
const AgingTable = dynamic(() => import('@/app/dashboard/AgingTable').then(mod => mod.AgingTable), { ssr: false, loading: () => <div className="h-64 bg-slate-800/50 animate-pulse rounded-xl" /> })
const AIInsightsCard = dynamic(() => import('@/app/dashboard/AIInsightsCard').then(mod => mod.AIInsightsCard), { ssr: false })
const QuickActionsCard = dynamic(() => import('@/components/dashboard/QuickActionsCard').then(mod => mod.QuickActionsCard), { ssr: false })
const StockRealtime = dynamic(() => import('@/app/_components/stock-realtime'), { ssr: false })
const ProductionRealtime = dynamic(() => import('@/app/_components/production-realtime'), { ssr: false })
// OrdersRealtime is currently missing, removing from dashboard to avoid crash
const OrdersRealtime = () => null
const AgiOperator = dynamic(() => import('@/components/dashboard/AgiOperator').then(mod => mod.AgiOperator), { ssr: false })

const APP_TITLE = 'LIVASOFA ERP'

export default function DashboardPage() {
  const router = useRouter()
  const { dashboardConfig: config, toggleDashboardSection: toggleSection } = useUIStore()
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    setHasLoaded(true)
    document.title = `Kontrol Paneli - ${APP_TITLE}`
    return () => { document.title = APP_TITLE }
  }, [])

  if (!hasLoaded) return null

  return (
    <AppDashboardLayout
      title="Kontrol Paneli"
      subtitle="Özet metrikler ve canlı veriler"
      icon={LayoutDashboard}
      actions={
        <Button 
          variant={isCustomizing ? "solid" : "outline"} 
          size="sm" 
          onClick={() => setIsCustomizing(!isCustomizing)}
          className="flex items-center gap-2 glass"
        >
          <Settings2 className="w-4 h-4" />
          {isCustomizing ? 'Düzenlemeyi Bitir' : 'Paneli Özelleştir'}
        </Button>
      }
    >
      <div className="space-y-8 pb-20 animate-reveal">
        
        {/* Zenith God Mode - Global Intelligence HUD */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
           <ZenithCard glow className="lg:col-span-2 bg-gradient-to-br from-primary/10 via-transparent to-transparent border-primary/20">
              <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]">
                       <LayoutDashboard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                       <h2 className="text-xl font-black text-white tracking-tighter uppercase">KÜRESEL İŞLETME ZEKÂSI</h2>
                       <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Zenith 2026 Core Intelligence</p>
                    </div>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">SİSTEM STABİL</span>
                    <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-1 italic">Uptime: 99.9%</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                 <div className="space-y-2">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Toplam Varlık</span>
                    <p className="text-xl font-black text-white italic">₺4.8M</p>
                 </div>
                 <div className="space-y-2">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Global Verim</span>
                    <p className="text-xl font-black text-emerald-500 italic">%92.4</p>
                 </div>
                 <div className="space-y-2">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Aktif Görev</span>
                    <p className="text-xl font-black text-primary italic">124</p>
                 </div>
                 <div className="space-y-2">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Risk Skoru</span>
                    <p className="text-xl font-black text-orange-500 italic">DÜŞÜK</p>
                 </div>
              </div>

              <div className="mt-8 p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-primary animate-pulse" />
                    <p className="text-[10px] font-bold text-white/40 uppercase italic">Hub AI: Önümüzdeki 48 saat içinde üretim hacminde %12 artış öngörülüyor.</p>
                 </div>
                 <Button variant="ghost" size="xs" className="text-primary font-black text-[9px] tracking-widest uppercase">DETAYLI ANALİZ</Button>
              </div>
           </ZenithCard>

           <ZenithCard className="bg-black/40 border-white/5">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                 </div>
                 <h3 className="text-[11px] font-black text-white uppercase tracking-widest">SATIŞ TAHMİN RADARI</h3>
              </div>
              <div className="h-24 flex items-end gap-1 mb-4">
                 {[40, 70, 45, 90, 65, 80, 100, 60, 85, 95].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary/20 rounded-t-sm relative group">
                       <div className="absolute inset-0 bg-primary opacity-40 group-hover:opacity-100 transition-opacity" style={{ height: `${h}%` }} />
                    </div>
                 ))}
              </div>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest text-center italic">MAYIS 2026 PROJEKSİYONU: ₺1.4M HEDEF</p>
           </ZenithCard>

           <ZenithCard className="bg-black/40 border-white/5">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-cyan-500" />
                 </div>
                 <h3 className="text-[11px] font-black text-white uppercase tracking-widest">İNSAN KAYNAKLARI</h3>
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-white/40 uppercase">Aktif Personel</span>
                    <span className="text-white">48 / 50</span>
                 </div>
                 <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-white/40 uppercase">Vardiya Verimi</span>
                    <span className="text-emerald-500">%96</span>
                 </div>
                 <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2 bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500/10 hover:text-cyan-400"
                    onClick={() => router.push('/hr')}
                 >
                    İK PORTALINA GİT
                 </Button>
              </div>
           </ZenithCard>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            {config.aiAdvisor && (
              <section className="animate-reveal">
                <AIInsightsCard />
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {config.financial && (
                <section className="space-y-4 animate-reveal">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">FİNANSAL ANALİTİK</h2>
                  </div>
                  <RevenueChart />
                </section>
              )}
              
              <section className="space-y-4 animate-reveal">
                 <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-cyan-500" />
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">CANLI OPERASYONEL AKIŞ</h2>
                  </div>
                  <ZenithCard className="bg-black/40 h-[380px] overflow-hidden p-0 relative">
                     <div className="absolute top-0 left-0 w-full h-10 bg-gradient-to-b from-black/80 to-transparent z-10" />
                     <div className="p-6 space-y-6">
                        {[
                           { t: '14:20', m: 'Üretim Emri #450 Tamamlandı', s: 'production' },
                           { t: '13:45', m: 'Yeni Satış Siparişi: Marmara Bayi', s: 'sales' },
                           { t: '12:10', m: 'Stok Girişi: Kumaş - 200mt', s: 'inventory' },
                           { t: '11:30', m: 'Tahsilat Onaylandı: ₺45,000', s: 'finance' },
                           { t: '10:00', m: 'Vardiya Başlatıldı: İstasyon 1-4', s: 'hr' }
                        ].map((item, i) => (
                           <div key={i} className="flex items-start gap-4 animate-reveal" style={{ animationDelay: `${i * 150}ms` }}>
                              <span className="text-[10px] font-black text-white/20 font-mono mt-1">{item.t}</span>
                              <div className="flex-1">
                                 <p className="text-[12px] font-bold text-white/70 uppercase tracking-tight">{item.m}</p>
                                 <span className={cn(
                                    "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border mt-1 inline-block",
                                    item.s === 'production' ? 'text-primary border-primary/20 bg-primary/5' :
                                    item.s === 'sales' ? 'text-orange-400 border-orange-400/20 bg-orange-400/5' :
                                    item.s === 'inventory' ? 'text-cyan-400 border-cyan-400/20 bg-cyan-400/5' :
                                    'text-emerald-400 border-emerald-400/20 bg-emerald-400/5'
                                 )}>{item.s}</span>
                              </div>
                           </div>
                        ))}
                     </div>
                     <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black/80 to-transparent" />
                  </ZenithCard>
              </section>
            </div>

            {config.kpis && (
              <section className="space-y-4 animate-reveal">
                <div className="flex items-center gap-2 mb-2">
                   <BarChart3 className="w-4 h-4 text-primary" />
                   <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">OPERASYONEL KPILAR</h2>
                </div>
                <DashboardSummary />
              </section>
            )}
          </div>

          <div className="space-y-8">
            {config.liveStatus && (
              <section className="space-y-4 animate-reveal">
                <div className="flex items-center gap-2 mb-2">
                   <Activity className="w-4 h-4 text-emerald-500" />
                   <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">ANLIK İSTASYON ANALİZİ</h2>
                </div>
                <div className="space-y-6">
                  <Card variant="elevated" padding="none" hover className="overflow-hidden group glass">
                    <CardHeader
                      className="px-5 pt-5"
                      title="Stok Durumu"
                      actions={<Package className="h-5 w-5 text-slate-400" />}
                    />
                    <CardBody className="px-5 pb-5 pt-0">
                      <StockRealtime />
                    </CardBody>
                  </Card>

                  <Card variant="elevated" padding="none" hover className="overflow-hidden group glass">
                    <CardHeader
                      className="px-5 pt-5"
                      title="Üretim Durumu"
                      actions={<Factory className="h-5 w-5 text-slate-400" />}
                    />
                    <CardBody className="px-5 pb-5 pt-0">
                      <ProductionRealtime />
                    </CardBody>
                  </Card>
                </div>
              </section>
            )}

            <RecentActivity />
          </div>
        </div>

        {/* Alerts Center - Performance optimized with cv-auto */}
        <div className="space-y-4 cv-auto mt-8">
          <NewFeatureHighlight featureId="critical_stock_alert">
            <CriticalStockAlert />
          </NewFeatureHighlight>
          <NewFeatureHighlight featureId="pending_approval_alert">
            <PendingApprovalAlert />
          </NewFeatureHighlight>
          <NewFeatureHighlight featureId="overdue_orders_alert">
            <OverdueOrdersAlert />
          </NewFeatureHighlight>
        </div>

        {/* Zenith Intelligence HUD */}
        <AgiOperator />
      </div>
    </AppDashboardLayout>
  )
}
