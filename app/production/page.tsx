'use client'

import { useState } from 'react'
import { 
  Plus, Search, Factory, Trash2, LayoutGrid, 
  Settings, Table as TableIcon, Layers, RefreshCw, 
  ArrowRight, AlertCircle, CheckCircle2, MoreHorizontal,
  Clock, PlayCircle, Box, Calendar, User, Package
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
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
import { formatDate } from '@/lib/utils/dateFormat'

/** 
 * parseOrderDetails: Combined notları diziye çevirir.
 * "Kumaş: X | Kasa: Y | Açıklama: Z" -> { specs: [{label, value}], description: "Z" }
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
  // SWR Hooks
  const { data: orders = [], isLoading: loadingOrders, mutate: mutateOrders } = useApi<ProductionOrder[]>('/api/production/orders')
  const { data: pendingSales = [], isLoading: loadingPending, mutate: mutatePending } = useApi<any[]>('/api/production/orders?tab=pending')
  
  // Local State
  const [activeTab, setActiveTab] = useState<'board' | 'list' | 'pending' | 'mrp'>('board')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Dialog States
  const [isSyncing, setIsSyncing] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Filtreleme
  const filteredOrders = orders.filter(order => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = !search || [
      order.order_number,
      order.product_name,
      order.customer_name
    ].some(val => val?.toLowerCase().includes(search))
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Senkronizasyon (Stok/MRP)
  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await fetchApi('/api/production/recalculate', { method: 'POST' })
      toast.success('Üretim durumları ve malzeme ihtiyaçları güncellendi.')
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
      toast.success('Üretim tamamlandı. Stoklar mamül olarak güncellendi.')
      mutateOrders()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Siparişi Üretime Al (Manual Conversion)
  const handleStartProduction = async (salesOrderId: string) => {
    try {
      toast.loading('Üretim emri oluşturuluyor...')
      await fetchApi('/api/orders/convert-to-production', {
        method: 'POST',
        body: JSON.stringify({ order_ids: [salesOrderId] }),
        headers: { 'Content-Type': 'application/json' }
      })
      toast.dismiss()
      toast.success('Üretim emri başarıyla oluşturuldu ve Pano\'ya eklendi.')
      mutatePending()
      mutateOrders()
    } catch (e: any) {
      toast.dismiss()
      toast.error(e.message || 'Üretim başlatılamadı. Lütfen stokları kontrol edin.')
    }
  }

  const pendingOrders = orders.filter(o => o.status === 'pending')
  const inProdOrders = orders.filter(o => o.status === 'in_production')
  const completedOrders = orders.filter(o => o.status === 'completed')

  return (
    <AppDashboardLayout
      title="Üretim Yönetimi"
      subtitle="Fabrika takip, iş emirleri ve malzeme planlama"
      icon={Factory}
      className="animate-reveal"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="soft" color="secondary" size="sm" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
            Eşitle
          </Button>
          <Button variant="solid" color="primary" size="sm" onClick={() => {/* Navigate to new order */}}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Emir
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Stats Cards - Modernized */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-reveal" style={{ animationDelay: '100ms' }}>
          <Card variant="glass" className="group">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-1 text-yellow-500">Bekleyen</p>
                  <p className="text-3xl font-black text-foreground">{pendingOrders.length}</p>
                </div>
                <div className="p-4 bg-yellow-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Clock className="w-7 h-7 text-yellow-500 shadow-glow" />
                </div>
              </div>
              <div className="mt-4 h-1 w-full bg-yellow-500/20 rounded-full overflow-hidden">
                 <div className="h-full bg-yellow-500 animate-glow" style={{ width: `${Math.min((pendingOrders.length / (orders.length || 1)) * 100, 100)}%` }} />
              </div>
            </CardBody>
          </Card>

          <Card variant="glass" className="group">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-1 text-blue-500">Üretimdekiler</p>
                  <p className="text-3xl font-black text-foreground">{inProdOrders.length}</p>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Factory className="w-7 h-7 text-blue-500 shadow-glow" />
                </div>
              </div>
              <div className="mt-4 h-1 w-full bg-blue-500/20 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 animate-glow" style={{ width: `${Math.min((inProdOrders.length / (orders.length || 1)) * 100, 100)}%` }} />
              </div>
            </CardBody>
          </Card>

          <Card variant="glass" className="group">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-1 text-emerald-500">Tamamlanan</p>
                  <p className="text-3xl font-black text-foreground">{completedOrders.length}</p>
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 shadow-glow" />
                </div>
              </div>
              <div className="mt-4 h-1 w-full bg-emerald-500/20 rounded-full overflow-hidden">
                 <div className="h-full bg-emerald-500 animate-glow" style={{ width: `${Math.min((completedOrders.length / (orders.length || 1)) * 100, 100)}%` }} />
              </div>
            </CardBody>
          </Card>

          <Card variant="glass" className="group">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-1">Toplam İş Emri</p>
                  <p className="text-3xl font-black text-foreground">{orders.length}</p>
                </div>
                <div className="p-4 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Layers className="w-7 h-7 text-primary shadow-glow" />
                </div>
              </div>
              <div className="mt-4 h-1 w-full bg-primary/20 rounded-full overflow-hidden">
                 <div className="h-full bg-primary animate-glow" style={{ width: '100%' }} />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Tab Switcher - Platinum */}
        <div className="flex justify-center animate-reveal" style={{ animationDelay: '200ms' }}>
          <div className="inline-flex p-1.5 glass rounded-2xl border border-white/5 shadow-2xl">
            <button
              onClick={() => setActiveTab('board')}
              className={cn(
                "flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-500",
                activeTab === 'board' 
                  ? "bg-primary text-white shadow-glow translate-z-10" 
                  : "text-foreground/40 hover:text-foreground/60 hover:bg-white/5"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Panoyu İzle
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={cn(
                "flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-500",
                activeTab === 'pending' 
                  ? "bg-amber-500 text-white shadow-glow translate-z-10" 
                  : "text-foreground/40 hover:text-foreground/60 hover:bg-white/5"
              )}
            >
              <Box className="w-4 h-4" />
              Gelen Siparişler
              {pendingSales.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white text-amber-600 rounded text-[10px] font-black">
                  {pendingSales.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={cn(
                "flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-500",
                activeTab === 'list' 
                  ? "bg-primary text-white shadow-glow translate-z-10" 
                  : "text-foreground/40 hover:text-foreground/60 hover:bg-white/5"
              )}
            >
              <TableIcon className="w-4 h-4" />
              Emir Listesi
            </button>
            <button
              onClick={() => setActiveTab('mrp')}
              className={cn(
                "flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-500",
                activeTab === 'mrp' 
                  ? "bg-primary text-white shadow-glow translate-z-10" 
                  : "text-foreground/40 hover:text-foreground/60 hover:bg-white/5"
              )}
            >
              <Layers className="w-4 h-4" />
              MRP Analizi
            </button>
          </div>
        </div>

        {/* Filters/Toolbar */}
        <Card variant="glass" className="animate-reveal" style={{ animationDelay: '300ms' }}>
          <CardBody className="p-4 flex flex-col md:flex-row items-center gap-4">
            <Input
              placeholder="Emir no veya ürün ara..."
              leftIcon={<Search className="w-5 h-5 opacity-40" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
              variant="filled"
            />
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
              {['all', 'pending', 'in_production', 'completed'].map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'solid' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                  className="rounded-lg px-4"
                >
                  {s === 'all' ? 'Tümü' : s === 'pending' ? 'Bekleyen' : s === 'in_production' ? 'Üretimde' : 'Tamamlanan'}
                </Button>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Dynamic Content Area */}
        <div className="animate-reveal" style={{ animationDelay: '400ms' }}>
          {activeTab === 'board' && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <KanbanBoard orders={filteredOrders} />
            </div>
          )}

          {activeTab === 'pending' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               {loadingPending ? (
                 <div className="col-span-full py-20 flex flex-col items-center gap-4">
                   <RefreshCw className="w-10 h-10 text-primary animate-spin" />
                   <p className="text-sm font-bold text-foreground/40">Gelen siparişler yükleniyor...</p>
                 </div>
               ) : pendingSales.length === 0 ? (
                 <div className="col-span-full py-20 flex flex-col items-center gap-4 bg-white/5 rounded-3xl border border-white/5">
                   <Box className="w-12 h-12 text-foreground/20" />
                   <p className="text-sm font-bold text-foreground/30 uppercase tracking-widest">Bekleyen yeni sipariş bulunamadı</p>
                 </div>
               ) : (
                 pendingSales.map((sales) => (
                   <Card key={sales.id} variant="glass" className="group relative bg-[#0B0E14] rounded-2xl border border-gray-800 overflow-hidden hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5">
                     <CardBody className="p-0">
                       {/* Header: Platinum Style */}
                       <div className="p-4 border-b border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-transparent">
                         <div className="flex justify-between items-start mb-3">
                           <div className="space-y-1">
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-amber-500 uppercase tracking-tight">Bekleyen Sipariş</span>
                               <span className="text-xs font-mono text-foreground/40">#{sales.order_number}</span>
                             </div>
                             <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                               {sales.product_name}
                             </h3>
                           </div>
                           <Badge color="info" className="text-[9px] font-black tracking-tighter">İşlem Bekliyor</Badge>
                         </div>

                         <div className="flex items-center gap-4 text-[11px] text-gray-400">
                           <div className="flex items-center gap-1.5 bg-blue-500/5 px-2 py-0.5 rounded-full border border-blue-500/10">
                             <Calendar className="w-3.5 h-3.5 text-blue-400" />
                             <span className="text-blue-200/80">{formatDate(sales.order_date || sales.created_at)}</span>
                           </div>
                           <div className="flex items-center gap-1.5 bg-purple-500/5 px-2 py-0.5 rounded-full border border-purple-500/10">
                             <Package className="w-3.5 h-3.5 text-purple-400" />
                             <span className="text-purple-200/80 font-bold">{sales.quantity} Adet</span>
                           </div>
                         </div>
                       </div>
                       
                       {/* Body: Matching Orders Page */}
                       <div className="p-4 space-y-4">
                         {/* Core Info */}
                         <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-800/30">
                           <div>
                             <span className="block text-[10px] text-gray-500 uppercase tracking-tight mb-0.5 font-bold">Cari / Bayi</span>
                             <span className="text-xs text-gray-200 font-medium break-words leading-relaxed">{sales.dealer_name || 'Bireysel'}</span>
                           </div>
                           <div>
                             <span className="block text-[10px] text-gray-500 uppercase tracking-tight mb-0.5 font-bold">Müşteri</span>
                             <span className="text-xs text-gray-200 font-medium break-words leading-relaxed">{sales.customer_name || '-'}</span>
                           </div>
                         </div>

                         {/* Technical Specs & Description */}
                          <div className="space-y-4">
                            {(() => {
                              const { specs, description } = parseOrderDetails(sales.notes);
                              return (
                                <>
                                  {/* Tech Specs: Individual Rows */}
                                  <div className="space-y-2">
                                    {specs.map((spec, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-[11px] py-1 border-b border-gray-800/20 last:border-0">
                                        <span className="text-gray-500 font-bold tracking-wider">{spec.label}</span>
                                        <span className="text-gray-300 font-medium">{spec.value}</span>
                                      </div>
                                    ))}
                                    {/* Additional spec: Quantity row as requested */}
                                    <div className="flex justify-between items-center text-[11px] py-1 border-b border-gray-800/20 last:border-0">
                                      <span className="text-gray-500 font-bold tracking-wider">ADET</span>
                                      <span className="text-blue-400 font-bold">{sales.quantity} Adet</span>
                                    </div>
                                  </div>

                                  {/* Description: Separate Section */}
                                  {description && (
                                    <div className="mt-3 pt-2 border-t border-gray-800/50">
                                      <span className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">AÇIKLAMA</span>
                                      <p className="text-[11px] text-gray-400 leading-relaxed italic bg-gray-900/40 p-2.5 rounded-xl border border-gray-800/30">
                                        "{description}"
                                      </p>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                         <Button 
                           variant="solid" 
                           color="primary" 
                           className="w-full h-11 bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-900/40 rounded-xl"
                           onClick={() => handleStartProduction(sales.id)}
                         >
                           <PlayCircle className="w-4 h-4 mr-2" />
                           Üretime Al
                         </Button>
                       </div>
                     </CardBody>
                   </Card>
                 ))
               )}
             </div>
          )}

          {activeTab === 'list' && (
            <Card variant="glass" className="overflow-hidden border-white/5">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-foreground/40 font-bold py-4 uppercase tracking-widest text-[10px]">Emir No</TableHead>
                    <TableHead className="text-foreground/40 font-bold py-4 uppercase tracking-widest text-[10px]">Ürün</TableHead>
                    <TableHead className="text-foreground/40 font-bold py-4 uppercase tracking-widest text-[10px]">Müşteri</TableHead>
                    <TableHead className="text-foreground/40 font-bold py-4 text-center uppercase tracking-widest text-[10px]">İlerleme</TableHead>
                    <TableHead className="text-foreground/40 font-bold py-4 text-center uppercase tracking-widest text-[10px]">Durum</TableHead>
                    <TableHead className="text-foreground/40 font-bold py-4 text-right uppercase tracking-widest text-[10px]">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingOrders ? (
                    <TableSkeleton cols={6} rows={5} />
                  ) : filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20 text-foreground/30 font-medium">
                        Gösterilecek üretim emri bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id} className="border-white/5 hover:bg-white/5 transition-all group">
                        <TableCell className="font-mono text-primary font-bold">{order.order_number}</TableCell>
                        <TableCell className="text-foreground font-bold">
                           <div className="flex flex-col">
                              <span>{order.product_name}</span>
                              <span className="text-[10px] text-foreground/30 font-mono">{order.sku || '—'}</span>
                           </div>
                        </TableCell>
                        <TableCell className="text-foreground/60">{order.customer_name || '—'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className={cn(
                                   "h-full transition-all duration-1000 animate-glow", 
                                   order.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-primary shadow-glow'
                                )} 
                                style={{ width: `${order.status === 'completed' ? 100 : 35}%` }} 
                              />
                            </div>
                            <span className="text-[9px] font-black text-foreground/30 uppercase tracking-tighter">{order.current_station || 'SİSTEM ANALİZİ'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                             variant="soft" 
                             color={order.status === 'completed' ? 'success' : order.status === 'in_production' ? 'primary' : 'info'}
                             className={cn("font-bold tracking-widest", order.status === 'in_production' && "animate-pulse")}
                          >
                             {order.status === 'completed' ? 'TAMAMLANDI' : order.status === 'in_production' ? 'ÜRETİMDE' : 'BEKLEMEDE'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10 transition-all"
                              title="İşlem Menüsü"
                            >
                              <MoreHorizontal className="w-5 h-5 shadow-glow" />
                            </Button>
                            {order.status !== 'completed' && (
                              <Button 
                                variant="ghost"
                                size="icon"
                                onClick={() => handleComplete(order.id)}
                                className="h-9 w-9 rounded-xl text-emerald-500 hover:bg-emerald-500/10 transition-all"
                                title="Üretimi Tamamla"
                              >
                                <CheckCircle2 className="w-4 h-4 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}

          {activeTab === 'mrp' && (
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
              <MRPPanel />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {/* Delete logic */}}
        title="Emri İptal Et"
        message="Bu üretim emrini iptal etmek istiyor musunuz? Rezerv edilmiş tüm stoklar serbest bırakılacaktır."
        variant="danger"
      />
    </AppDashboardLayout>
  )
}