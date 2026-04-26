'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Search, Factory, Trash2, LayoutGrid, 
  Settings, Table as TableIcon, Layers, RefreshCw, 
  ArrowRight, AlertCircle, CheckCircle2, MoreHorizontal,
  Clock, PlayCircle, Box, Calendar, User, Package, Zap, BarChart3
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { fetchApi } from '@/lib/api/fetch'
import { useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { KanbanBoard, type ProductionOrder } from '@/components/production/KanbanBoard'
import { MRPPanel } from '@/components/production/MRPPanel'
import { cn } from '@/lib/cn'
import { Input } from '@/components/ui/Input'
import { ZenithCard, ZenithHeader } from '@/components/ui/ZenithCard'
import MainDashboardCard from '@/components/production/MainDashboardCard'
import { ProductionDrawer } from '@/components/production/ProductionDrawer'
import { formatDate } from '@/lib/utils/dateFormat'
import { MissionControl } from '@/components/production/MissionControl'

/** 
 * parseOrderDetails: Combined notları diziye çevirir.
 */
function parseOrderDetails(notes: string | null) {
  if (!notes) return { specs: [], description: '' };
  const parts = notes.split('|').map(p => p.trim()).filter(Boolean);
  const specs: Array<{ label: string, value: string }> = [];
  let description = '';
  const knownLabels = ['Kumaş', 'Kasa', 'Ayak', 'Kirlent', 'Birim', 'KİRLENT', 'Parça', 'PARÇA'];

  parts.forEach(part => {
    const colonIndex = part.indexOf(':');
    if (colonIndex > -1) {
      const label = part.substring(0, colonIndex).trim();
      const value = part.substring(colonIndex + 1).trim();
      if (knownLabels.some(kl => kl.toLowerCase() === label.toLowerCase())) {
        specs.push({ label: label.toUpperCase(), value });
      } else {
        description += (description ? ' | ' : '') + part;
      }
    } else {
      description += (description ? ' | ' : '') + part;
    }
  });
  return { specs, description };
}

export default function ProductionPage() {
  const { data: orders = [], mutate: mutateOrders } = useApi<ProductionOrder[]>('/api/production/orders')
  const { data: pendingSales = [], mutate: mutatePending } = useApi<any[]>('/api/production/orders?tab=pending')
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  const [activeTab, setActiveTab] = useState<'board' | 'list' | 'pending' | 'mrp' | 'mission'>('board')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (statusFilter !== 'all') {
      params.set('status', statusFilter)
    } else {
      params.delete('status')
    }
    const query = params.toString()
    router.replace(`${pathname}${query ? '?' + query : ''}`, { scroll: false })
  }, [statusFilter, pathname, router, searchParams])

  const safeOrders = orders || []
  const safePendingSales = pendingSales || []

  const filteredOrders = useMemo(() => {
    return safeOrders.filter(order => {
      const search = searchTerm.toLowerCase()
      const matchesSearch = !search || [
        order.order_number,
        order.product_name,
        order.customer_name
      ].some(val => val?.toLowerCase().includes(search))
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [safeOrders, searchTerm, statusFilter])

  const handleCardClick = (status: string) => {
    console.log('PLATINUM_CLICK_REGISTERED:', status)
    setStatusFilter(status)
    setActiveTab('list')
    setIsDrawerOpen(true)
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await fetchApi('/api/production/recalculate', { method: 'POST' })
      toast.success('Üretim durumları güncellendi.')
      mutateOrders()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleComplete = async (orderId: string) => {
    try {
      await fetchApi(`/api/production/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
        headers: { 'Content-Type': 'application/json' }
      })
      toast.success('Üretim emri tamamlandı.')
      mutateOrders()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleMove = async (orderId: string, toStationId: string) => {
    try {
      if (toStationId === 'completed') {
        return handleComplete(orderId);
      }
      
      await fetchApi('/api/production/move', {
        method: 'POST',
        body: JSON.stringify({ orderId, toStationId }),
        headers: { 'Content-Type': 'application/json' }
      })
      toast.success(`Sipariş ${toStationId} hattına taşındı.`)
      mutateOrders()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      mutateOrders()
      mutatePending()
    }, 10000)
    return () => clearInterval(interval)
  }, [mutateOrders, mutatePending])

  const pendingCount = safeOrders.filter(o => o.status === 'pending').length
  const inProdCount = safeOrders.filter(o => o.status === 'in_production').length
  const completedCount = safeOrders.filter(o => o.status === 'completed').length

  return (
    <AppDashboardLayout
      title="Üretim Yönetimi"
      subtitle="Fabrika takip, iş emirleri ve malzeme planlama"
      icon={Zap}
      className="animate-reveal"

      actions={
        <div className="flex items-center gap-2 relative z-50">
          <Button variant="glass" size="xs" onClick={handleSync} disabled={isSyncing} className="border-white/5 rounded-lg text-[10px] tracking-widest font-black uppercase">
            <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isSyncing && "animate-spin")} />
            SENKRON
          </Button>
          <Button variant="solid" color="primary" size="xs" className="shadow-[0_0_20px_rgba(var(--color-primary),0.3)] rounded-lg text-[10px] font-black border-none">
            <Plus className="w-3.5 h-3.5 mr-2" />
            YENİ EMİR
          </Button>
        </div>
      }
    >
      <AnimatePresence mode="wait">
        {isDrawerOpen && (
          <ProductionDrawer 
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            status={statusFilter as any}
            orders={filteredOrders}
            totalCount={safeOrders.length}
          />
        )}
      </AnimatePresence>

      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] pointer-events-auto">
        <Button 
          variant="glass" 
          size="xs" 
          onClick={() => setIsDrawerOpen(true)}
          className="bg-cyan-500/10 border-cyan-500/20 text-cyan-400 font-black text-[9px] px-6 py-2 rounded-full uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(6,182,212,0.2)]"
        >
          FORCE DETAY PANELİ
        </Button>
      </div>

      <div className="space-y-8 relative z-40 max-w-[1780px] mx-auto">
        {/* Stats Cards - Zenith */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-reveal">
          <ZenithCard 
            glow
            onClick={() => handleCardClick('pending')}
            className={cn(
               "cursor-pointer active:scale-95 transition-all duration-500 border-orange-500/10",
               statusFilter === 'pending' && "border-orange-500/50 bg-orange-500/5"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-2">BEKLEYEN</p>
                <p className="text-4xl font-black text-white tracking-tighter">{pendingCount}</p>
              </div>
              <div className="p-5 rounded-[2rem] bg-orange-500/10 border border-orange-500/20">
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </ZenithCard>

          <ZenithCard 
            glow
            onClick={() => handleCardClick('in_production')}
            className={cn(
               "cursor-pointer active:scale-95 transition-all duration-500 border-blue-500/10",
               statusFilter === 'in_production' && "border-blue-500/50 bg-blue-500/5"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2">ÜRETİMDE</p>
                <p className="text-4xl font-black text-white tracking-tighter">{inProdCount}</p>
              </div>
              <div className="p-5 rounded-[2rem] bg-blue-500/10 border border-blue-500/20">
                <Factory className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </ZenithCard>

          <ZenithCard 
            glow
            onClick={() => handleCardClick('completed')}
            className={cn(
               "cursor-pointer active:scale-95 transition-all duration-500 border-emerald-500/10",
               statusFilter === 'completed' && "border-emerald-500/50 bg-emerald-500/5"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2">TAMAMLANAN</p>
                <p className="text-4xl font-black text-white tracking-tighter">{completedCount}</p>
              </div>
              <div className="p-5 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
            </div>
          </ZenithCard>

          <ZenithCard 
            glow
            onClick={() => handleCardClick('all')}
            className={cn(
               "cursor-pointer active:scale-95 transition-all duration-500 border-primary/10",
               statusFilter === 'all' && "border-primary/50 bg-primary/5"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">TOPLAM EMİR</p>
                <p className="text-4xl font-black text-white tracking-tighter">{safeOrders.length}</p>
              </div>
              <div className="p-5 rounded-[2rem] bg-primary/10 border border-primary/20">
                <Layers className="w-8 h-8 text-primary" />
              </div>
            </div>
          </ZenithCard>
        </div>

        {/* Zenith Intelligence Bridge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-reveal">
           <div className="lg:col-span-2">
              <ZenithCard className="h-full border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-cyan-400" />
                       </div>
                       <div>
                          <h3 className="text-sm font-black text-white uppercase tracking-widest">ÜRETİM STRATEJİ ANALİZİ</h3>
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mt-0.5">Yapay Zeka Destekli Operasyonel Özet</p>
                       </div>
                    </div>
                    <Badge variant="glass" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-black text-[9px] px-4">SİSTEM OPTİMİZE</Badge>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                       <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-cyan-500 opacity-40" />
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Kapasite Kullanımı</span>
                       </div>
                       <div className="space-y-2">
                          <div className="flex justify-between text-[11px] font-black text-white">
                             <span>HAT VERİMLİLİĞİ</span>
                             <span>%88.4</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-cyan-500 w-[88.4%] shadow-[0_0_10px_#06b6d4]" />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-orange-500 opacity-40" />
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Stok Risk Faktörü</span>
                       </div>
                       <div className="space-y-2">
                          <div className="flex justify-between text-[11px] font-black text-white">
                             <span>HAMMADDE RİSKİ</span>
                             <span className="text-orange-500">DÜŞÜK</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-orange-500 w-[12%] shadow-[0_0_10px_#f97316]" />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-500 opacity-40" />
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Termin Başarısı</span>
                       </div>
                       <div className="space-y-2">
                          <div className="flex justify-between text-[11px] font-black text-white">
                             <span>ZAMANINDA TESLİM</span>
                             <span className="text-emerald-500">%96</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500 w-[96%] shadow-[0_0_10px_#10b981]" />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center justify-between">
                    <p className="text-[10px] font-bold text-white/20 italic">Hub AI: Mevcut üretim hızıyla tüm siparişler 4.2 gün içinde tamamlanabilir.</p>
                    <Button variant="ghost" size="xs" className="text-cyan-400 font-black text-[9px] hover:bg-cyan-500/10">DETAYLI RAPOR <ArrowRight className="w-3 h-3 ml-2" /></Button>
                 </div>
              </ZenithCard>
           </div>

           <div>
              <ZenithCard className="h-full border-white/5 bg-black/40">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                       <AlertCircle className="w-4 h-4 text-orange-500" />
                    </div>
                    <h3 className="text-[11px] font-black text-white uppercase tracking-widest">KRİTİK UYARILAR</h3>
                 </div>
                 <div className="space-y-4">
                    <div className="p-3 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-start gap-3">
                       <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shadow-[0_0_8px_#f97316]" />
                       <div>
                          <p className="text-[11px] font-black text-white uppercase tracking-tight">ALASKA KUMAŞ KRİTİK</p>
                          <p className="text-[9px] font-bold text-white/30 uppercase mt-0.5">Siparişler için 45m eksik var</p>
                       </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                       <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shadow-[0_0_8px_#3b82f6]" />
                       <div>
                          <p className="text-[11px] font-black text-white uppercase tracking-tight">MONTAJ HATTI YOĞUN</p>
                          <p className="text-[9px] font-bold text-white/30 uppercase mt-0.5">Bekleme süresi %15 arttı</p>
                       </div>
                    </div>
                 </div>
                 <div className="mt-6">
                    <Button className="w-full h-10 bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-xl">
                       TÜM ALERTLERİ YÖNET
                    </Button>
                 </div>
              </ZenithCard>
           </div>
        </div>


        {/* Tab Switcher - Zenith */}


        {/* Tab Switcher - Zenith */}
        <div className="flex justify-center animate-reveal">
          <div className="inline-flex p-2 glass rounded-[2.5rem] border border-white/5 shadow-2xl">
            {['board', 'pending', 'list', 'mrp', 'mission'].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={cn(
                  "flex items-center gap-3 px-10 py-4 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all duration-500",
                  activeTab === t ? "bg-primary text-white glow-primary" : "text-white/20 hover:text-white/40"
                )}
              >
                {t === 'board' ? <LayoutGrid className="w-4 h-4" /> : 
                 t === 'pending' ? <Box className="w-4 h-4" /> : 
                 t === 'list' ? <TableIcon className="w-4 h-4" /> : 
                 t === 'mrp' ? <Layers className="w-4 h-4" /> :
                 <TrendingUp className="w-4 h-4" />}
                
                {t === 'board' ? 'PANOYU İZLE' : 
                 t === 'pending' ? 'GELEN SİPARİŞLER' : 
                 t === 'list' ? 'EMİR LİSTESİ' : 
                 t === 'mrp' ? 'MRP ANALİZİ' :
                 'STRATEJİK ANALİZ'}
              </button>
            ))}
          </div>
        </div>


        {/* Dynamic Content */}
        <div className="animate-reveal">
          {activeTab === 'board' && <KanbanBoard orders={filteredOrders} onMove={handleMove} />}
          {activeTab === 'pending' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {safePendingSales.map((sales) => (
                 <MainDashboardCard 
                    key={sales.id}
                    title={sales.product_name}
                    category="STANDART"
                    supplyTime="3 Gün"
                    location="Depo-A"
                    stats={{ physical: sales.quantity * 2, reserved: sales.quantity, available: 1500, requirement: 0 }}
                    supplier={{ name: sales.customer_name || 'Liva Tekstil', price: "29,00", trend: 'up' }}
                    lastAction={formatDate(sales.created_at)}
                 />
               ))}
             </div>
          )}
          {activeTab === 'list' && (
            <Card variant="glass" className="overflow-hidden border-none bg-black/40 backdrop-blur-3xl rounded-[32px] shadow-2xl">
              <Table>
                <TableHeader className="bg-white/5 border-b border-white/[0.05]">
                  <TableRow className="border-none hover:bg-transparent text-[9px] font-black uppercase tracking-widest text-white/20">
                    <TableHead className="px-6 py-5">Emir No</TableHead>
                    <TableHead className="px-6 py-5">Ürün & Model</TableHead>
                    <TableHead className="px-6 py-5">Müşteri</TableHead>
                    <TableHead className="px-6 py-5 text-center">Durum</TableHead>
                    <TableHead className="px-6 py-5 text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 opacity-20 italic">Kayıt Bulunamadı</TableCell></TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id} className="border-b border-white/[0.02] last:border-none group">
                        <TableCell className="font-mono text-cyan-400 font-black px-6">{order.order_number}</TableCell>
                        <TableCell className="px-6 text-white font-black uppercase italic">{order.product_name}</TableCell>
                        <TableCell className="px-6 text-white/40">{order.customer_name || '—'}</TableCell>
                        <TableCell className="px-6 text-center">
                          <Badge variant="solid" className="rounded-full px-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                            {order.status === 'completed' ? 'TAMAMLANDI' : 'ÜRETİMDE'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 text-right">
                          <Button variant="glass" size="icon" onClick={() => handleComplete(order.id)} className="h-9 w-9 text-white/20 hover:text-[#10B981]">
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
          {activeTab === 'mrp' && <MRPPanel />}
          {activeTab === 'mission' && <MissionControl orders={safeOrders} />}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Emri İptal Et"
        message="Emin misiniz?"
        variant="danger"
        onConfirm={() => {}}
      />
    </AppDashboardLayout>
  )
}