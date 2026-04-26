'use client'

import { useState, useEffect } from 'react'
import { 
  Package, 
  Truck, 
  Wallet, 
  User, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  Bell, 
  Send,
  Zap,
  Globe,
  ArrowRight,
  LayoutGrid,
  History,
  Activity,
  Trophy,
  Rocket
} from 'lucide-react'
import { fetchApi as safeFetch } from '@/lib/api/client'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/lib/store/authStore'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import Link from 'next/link'

const statusLabels: Record<string, string> = {
  pending: 'Beklemede',
  approval_pending: 'Onay Bekliyor',
  processing: 'İşleniyor',
  in_production: 'Üretimde',
  ready_for_dispatch: 'Sevkiyata Hazır',
  dispatched: 'Sevk Edildi',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  in_transit: 'Yolda / Kargo',
  delivered: 'Teslim Edildi',
}

function formatDate(s: string | null) {
  if (!s) return '–'
  try {
    const d = new Date(s)
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('tr-TR')
  } catch {
    return s
  }
}

export default function BayiDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [me, setMe] = useState<{ user?: { dealer_name?: string | null } } | null>(null)

  const [dashboardData, setDashboardData] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, ordersRes, shipmentsRes, dashRes] = await Promise.all([
          safeFetch('/api/bayi/me'),
          safeFetch('/api/bayi/orders'),
          safeFetch('/api/bayi/shipments'),
          safeFetch('/api/bayi/dashboard'),
        ])

        const meData = (meRes as any)?.user ?? (meRes as any)?.data?.user ?? (meRes as any)
        const ordersList = Array.isArray((ordersRes as any)?.data) ? (ordersRes as any).data : (Array.isArray(ordersRes) ? ordersRes : [])
        const shipmentsList = Array.isArray((shipmentsRes as any)?.data) ? (shipmentsRes as any).data : (Array.isArray(shipmentsRes) ? shipmentsRes : [])

        setMe(meData ? { user: typeof meData === 'object' && meData !== null ? meData : { dealer_name: null } } : null)
        setOrders(ordersList)
        setShipments(shipmentsList)
        if ((dashRes as any)?.success) {
          setDashboardData((dashRes as any).data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const dealerName = (me?.user?.dealer_name ?? (user as any)?.dealer_name ?? '').trim() || 'Bayi Ana Sayfası'
  const lastOrders = orders.slice(0, 5)
  const lastShipments = shipments.slice(0, 5)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-6 animate-reveal">
        <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin shadow-glow shadow-primary/20" />
        <p className="text-[10px] text-foreground/30 font-black uppercase tracking-[0.3em] animate-pulse">Partner Verileri İşleniyor</p>
      </div>
    )
  }

  const perf = dashboardData?.performance || { progressPercent: 0, currentRevenue: 0, monthTarget: 0 }
  const isTargetAchieved = perf.progressPercent >= 100

  return (
    <div className="space-y-10 animate-reveal">
      {/* Welcome Banner - Platinum */}
      <Card variant="glass" className="border-white/5 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full -mr-40 -mt-40 pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
         <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-secondary/5 blur-[90px] rounded-full -ml-20 -mb-20 pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
         
         <CardBody className="p-10 flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
            <div className="flex items-center gap-8 text-center md:text-left">
               <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow-lg transform hover:rotate-6 transition-transform duration-500">
                  <Rocket className="w-12 h-12 text-white" />
               </div>
               <div className="flex flex-col">
                  <h1 className="text-4xl font-black tracking-tight text-white mb-2 leading-none">
                     HOŞ GELDİNİZ, <br />
                     <span className="text-primary italic">{(user as any)?.full_name || 'B2B PARTNERİ'}</span>
                  </h1>
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                     <Badge variant="soft" className="text-[10px] font-black tracking-widest bg-success/10 border-success/20 text-success">ÇEVRİMİÇİ</Badge>
                     <p className="text-foreground/30 text-[10px] font-black uppercase tracking-[0.2em]">{dealerName}</p>
                  </div>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
               <div className="px-6 py-4 bg-white/5 border border-white/5 rounded-3xl backdrop-blur-md flex items-center gap-4 group hover:bg-white/10 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-glow-sm">
                     <Send className="w-6 h-6" />
                  </div>
                  <div>
                     <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-0.5">Bildirimler</p>
                     <p className="text-sm font-black text-white uppercase tracking-tight italic">Aktif Entegrasyon</p>
                  </div>
               </div>
               <Link href="/bayi/orders/new" className="group">
                  <Button size="lg" color="primary" className="h-full px-10 rounded-3xl font-black uppercase tracking-widest italic shadow-lg shadow-primary/20 group-hover:scale-105 transition-all">
                     <Package className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                     SİPARİŞ OLUŞTUR
                  </Button>
               </Link>
            </div>
         </CardBody>
      </Card>

      {/* Announcements */}
      {dashboardData?.announcements?.length > 0 && (
        <Card variant="glass" className="bg-warning/5 border-warning/10 relative overflow-hidden">
           <CardBody className="p-8">
              <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-warning/10 rounded-[1.5rem] text-warning border border-warning/20">
                    <Bell className="w-6 h-6 shadow-glow animate-bounce" />
                 </div>
                 <div>
                    <h3 className="text-lg font-black uppercase tracking-widest text-warning italic">Sistem Duyuruları & Kampanyalar</h3>
                    <p className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest mt-1">GÜNCEL FIRSATLARI KAÇIRMAYIN</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {dashboardData.announcements.map((a: any) => (
                    <div key={a.id} className="p-5 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all group">
                       <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-black text-foreground group-hover:text-warning transition-colors uppercase tracking-tight">{a.title}</h4>
                          <Badge variant="soft" className="text-[7px] font-black">YENİ</Badge>
                       </div>
                       <p className="text-[11px] font-medium text-foreground/40 leading-relaxed uppercase tracking-tighter italic">{a.content}</p>
                    </div>
                 ))}
              </div>
           </CardBody>
        </Card>
      )}

      {/* Performance & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         <Card variant="glass" className={cn("lg:col-span-2 border-white/5 relative overflow-hidden group/perf", isTargetAchieved && "border-success/20 bg-success/5")}>
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover/perf:scale-110 transition-transform duration-1000">
               <Trophy className={cn("w-48 h-48", isTargetAchieved ? "text-success" : "text-primary")} />
            </div>
            <CardBody className="p-10 space-y-8 relative z-10">
               <div className="flex justify-between items-start">
                  <div>
                     <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-4 mb-2">
                        <Target className={cn("w-7 h-7 shadow-glow", isTargetAchieved ? "text-success" : "text-secondary")} />
                        AYLIK PERFORMANS PLANI
                     </h3>
                     <p className="text-[11px] font-bold text-foreground/30 uppercase leading-relaxed max-w-lg italic tracking-[0.1em]">Hedef baremleri aşarak ekstra iskontoların ve <span className="text-primary font-black shadow-glow-sm">Vıp Ayrıcalıkların</span> sahibi olun.</p>
                  </div>
                  {isTargetAchieved && (
                     <Badge color="success" className="text-[9px] font-black px-4 h-8 tracking-widest shadow-glow shadow-success/20">HEDEF TAMAMLANDI</Badge>
                  )}
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="flex flex-col gap-2">
                     <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] opacity-40">Mevcut Cironuz (Net)</span>
                     <span className="text-4xl font-black text-white italic drop-shadow-lg">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(perf.currentRevenue)}
                     </span>
                  </div>
                  <div className="flex flex-col gap-2 md:items-end">
                     <span className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em]">Aylık Kota Hedefi</span>
                     <span className="text-3xl font-black text-foreground/20 italic">
                        {perf.monthTarget > 0 ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(perf.monthTarget) : 'ESTİME EDİLMEDİ'}
                     </span>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase">
                     <span className="text-foreground/30">İlerleme Durumu</span>
                     <span className={cn("px-3 py-1 bg-white/5 border border-white/5 rounded-full", isTargetAchieved ? "text-success" : "text-primary")}>%{perf.progressPercent} DOLULUK</span>
                  </div>
                  <div className="h-6 w-full bg-white/5 rounded-[1.5rem] overflow-hidden border border-white/5 p-1.5 shadow-inner">
                     <div
                        className={cn(
                           "h-full rounded-full transition-all duration-1000 relative shadow-glow-sm", 
                           isTargetAchieved ? 'bg-gradient-to-r from-success to-emerald-400 shadow-success/40' : 'bg-gradient-to-r from-primary to-secondary shadow-primary/40'
                        )}
                        style={{ width: `${Math.min(100, perf.progressPercent)}%` }}
                     >
                        {!isTargetAchieved && (
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full animate-shimmer"></div>
                        )}
                     </div>
                  </div>
               </div>

               {!isTargetAchieved && perf.monthTarget > 0 && (
                 <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-center gap-4 animate-reveal">
                    <TrendingUp className="w-5 h-5 text-primary shadow-glow shadow-primary/20" />
                    <p className="text-[10px] font-black uppercase tracking-tight text-foreground/60 italic leading-relaxed">
                       Sıradaki VIP Level için sadece <span className="text-primary font-black underline decoration-primary/30 decoration-2 underline-offset-4">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(perf.monthTarget - perf.currentRevenue)}</span> tutarında yeni sipariş gerekiyor.
                    </p>
                 </div>
               )}
            </CardBody>
         </Card>

         <div className="flex flex-col gap-6">
            <Card variant="glass" className="h-full border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all group">
               <CardBody className="p-8 flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                     <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Cari Hesabım</p>
                     <p className="text-4xl font-black text-white group-hover:scale-105 transition-all origin-left shadow-glow-sm">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(dashboardData?.stats?.balance || 0)}
                     </p>
                     <p className="text-[9px] font-bold text-foreground/20 uppercase italic tracking-widest mt-1">GÜNCEL BAKİYE</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/10 group-hover:scale-110 transition-all shadow-glow-sm">
                     <Wallet className="w-8 h-8" />
                  </div>
               </CardBody>
            </Card>

            <Link href="/bayi/orders" className="group">
               <Card variant="glass" className="h-full border-warning/20 bg-warning/5 hover:bg-warning/10 transition-all">
                  <CardBody className="p-8 flex items-center justify-between">
                     <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-black text-warning uppercase tracking-[0.2em] mb-1">Üretimdekiler</p>
                        <p className="text-5xl font-black text-white group-hover:text-warning group-hover:scale-110 transition-all origin-left shadow-glow-sm">
                           {dashboardData?.stats?.pendingOrders || 0}
                        </p>
                        <p className="text-[9px] font-bold text-foreground/20 uppercase italic tracking-widest mt-1">Sevkiyat Bekleyen</p>
                     </div>
                     <div className="p-4 rounded-2xl bg-warning/10 text-warning border border-warning/10 group-hover:scale-110 transition-all shadow-glow-sm">
                        <Clock className="w-8 h-8" />
                     </div>
                  </CardBody>
               </Card>
            </Link>
         </div>
      </div>

      {/* Lists Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* Orders History */}
         <Card variant="glass" className="border-white/5 overflow-hidden">
            <CardHeader className="p-8 border-b border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary" />
                  <h3 className="font-black uppercase tracking-widest text-sm text-foreground/80">Sipariş Geçmişi</h3>
               </div>
               <Link href="/bayi/orders">
                  <Button variant="ghost" size="xs" color="primary" className="text-[9px] font-black uppercase tracking-widest hover:bg-primary/5">TÜMÜNÜ GÖR <ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
               </Link>
            </CardHeader>
            <CardBody className="p-4">
               {lastOrders.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center opacity-10">
                     <History className="w-12 h-12 mb-4" />
                     <p className="text-xs font-black uppercase tracking-widest">Sipariş Kaydı Bulunmuyor</p>
                  </div>
               ) : (
                  <div className="space-y-3">
                     {lastOrders.map((o) => (
                        <Link href={`/bayi/orders/${o.id}`} key={o.id} className="block group">
                           <div className="flex items-center justify-between p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-primary/20 transition-all">
                              <div className="flex items-start gap-4">
                                 <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                                    <Package className="w-5 h-5" />
                                 </div>
                                 <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1">
                                       <span className="font-mono text-xs font-black text-white group-hover:text-primary transition-colors">{o.order_number || '–'}</span>
                                       <span className="text-[10px] font-bold text-foreground/20 italic tracking-tighter">{formatDate(o.created_at || o.order_date)}</span>
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-tight text-foreground/60 w-[180px] break-words truncate">{o.product_name}</span>
                                    {o.customer_name && <span className="text-[9px] font-bold text-foreground/20 uppercase italic tracking-tighter mt-0.5">Müşteri: {o.customer_name}</span>}
                                 </div>
                              </div>
                              <Badge 
                                 variant="soft" 
                                 color={o.status === 'completed' ? 'success' : o.status === 'cancelled' ? 'error' : 'secondary'} 
                                 className="text-[8px] font-black px-4 tracking-widest shadow-glow-sm"
                              >
                                 {statusLabels[o.status]?.toUpperCase() || o.status?.toUpperCase()}
                              </Badge>
                           </div>
                        </Link>
                     ))}
                  </div>
               )}
            </CardBody>
         </Card>

         {/* Deliveries */}
         <Card variant="glass" className="border-white/5 overflow-hidden">
            <CardHeader className="p-8 border-b border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-success" />
                  <h3 className="font-black uppercase tracking-widest text-sm text-foreground/80">Sipariş Teslimatları</h3>
               </div>
               <Link href="/bayi/shipments">
                  <Button variant="ghost" size="xs" color="success" className="text-[9px] font-black uppercase tracking-widest hover:bg-success/5">LOJİSTİK TAKİBİ <ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
               </Link>
            </CardHeader>
            <CardBody className="p-4">
               {lastShipments.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center opacity-10">
                     <Truck className="w-12 h-12 mb-4" />
                     <p className="text-xs font-black uppercase tracking-widest">Sevkiyat Kaydı Bulunmuyor</p>
                  </div>
               ) : (
                  <div className="space-y-3">
                     {lastShipments.map((s) => (
                        <div key={s.id} className="flex items-center justify-between p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                           <div className="flex items-start gap-4">
                              <div className="p-3 bg-success/10 rounded-xl text-success group-hover:scale-110 transition-transform">
                                 <Truck className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col">
                                 <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-xs font-black text-white">{s.shipment_number || '–'}</span>
                                    <span className="text-[10px] font-bold text-foreground/20 italic tracking-tighter">{formatDate(s.created_at || s.shipment_date)}</span>
                                 </div>
                                 <span className="text-[11px] font-black uppercase tracking-tight text-foreground/60">Lojistik Birimine Teslim Edildi</span>
                              </div>
                           </div>
                           <Badge 
                              variant="soft" 
                              className={cn(
                                 "text-[8px] font-black px-4 tracking-widest",
                                 s.status === 'delivered' ? "bg-success/5 text-success border-success/20 shadow-glow-sm shadow-success/10" : 
                                 s.status === 'in_transit' ? "bg-primary/5 text-primary border-primary/20" : "bg-white/5 text-foreground/20"
                              )}
                           >
                              {statusLabels[s.status]?.toUpperCase() || s.status?.toUpperCase()}
                           </Badge>
                        </div>
                     ))}
                  </div>
               )}
            </CardBody>
         </Card>
      </div>
    </div>
  )
}
