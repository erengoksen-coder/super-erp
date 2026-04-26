'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Package, 
  Truck, 
  Printer, 
  Filter, 
  Calendar, 
  User, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Trash2, 
  Plus, 
  Search, 
  ChevronRight, 
  FileText, 
  Download,
  Activity,
  ArrowRight,
  Info,
  TrendingUp
} from 'lucide-react'
import { fetchApi, useApi } from '@/lib/api/client'
import { formatDate } from '@/lib/utils/dateFormat'
import { usePolling } from '@/lib/hooks/usePolling'
import { toast } from '@/lib/notify'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/cn'
import { ZenithCard, ZenithHeader } from '@/components/ui/ZenithCard'

interface Shipment {
  id: string
  shipment_number: string
  customer_id?: string
  customer_name: string
  customer_code: string
  shipment_date: string
  status: string
  total_quantity: number
  item_count: number
  invoice_id?: string | null
  invoice_number?: string | null
  items?: Array<{
    id: string
    product_name: string
    product_sku: string
    quantity: number
  }>
}

interface ReadyItem {
  customer_id: string
  customer_name: string
  customer_code: string
  count: number
}

export default function ShipmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [readyItems, setReadyItems] = useState<ReadyItem[]>([])
  const [readyProducts, setReadyProducts] = useState<any[]>([])
  const [selectedReadyCustomerId, setSelectedReadyCustomerId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>(searchParams?.get('status') || 'all')
  const [filterCustomer, setFilterCustomer] = useState<string>(searchParams?.get('customer') || 'all')
  const [filterPeriod, setFilterPeriod] = useState<string>('all') 
  const [filterCompleted, setFilterCompleted] = useState<string>('all')
  const [showDetailedView, setShowDetailedView] = useState<boolean>(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [exporting, setExporting] = useState(false)
  const [clearingShipmentData, setClearingShipmentData] = useState(false)
  const [confirmClearShipment, setConfirmClearShipment] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [])

  const shipmentsKey = useMemo(() => {
    if (filterStatus === 'ready') return null
    let url = '/api/shipments'
    const params = new URLSearchParams()
    if (filterCompleted !== 'all') params.append('status', filterCompleted)
    else if (filterStatus !== 'all') params.append('status', filterStatus)
    if (filterCustomer !== 'all') params.append('customer_id', filterCustomer)
    if (params.toString()) url += '?' + params.toString()
    return url
  }, [filterStatus, filterCompleted, filterCustomer])

  const readyItemsKey = useMemo(() => {
    return filterStatus === 'ready' ? '/api/shipments/ready-items' : null
  }, [filterStatus])

  const readyProductsKey = useMemo(() => {
    if (filterStatus !== 'ready' || !selectedReadyCustomerId) return null
    return `/api/shipments/ready-items?customer_id=${selectedReadyCustomerId}`
  }, [filterStatus, selectedReadyCustomerId])

  const { data: shipmentsData, isLoading: shipmentsLoading, mutate: mutateShipments } = useApi<Shipment[]>(shipmentsKey)
  const { data: readyItemsData, isLoading: readyItemsLoading } = useApi<{ items: any[] }>(readyItemsKey)
  const { data: readyProductsData, isLoading: readyProductsLoading } = useApi<{ items: any[] }>(readyProductsKey)

  usePolling(() => { void mutateShipments() })

  const isLoading = shipmentsLoading || readyItemsLoading || readyProductsLoading

  useEffect(() => {
    if (filterStatus === 'ready') {
      const items = readyItemsData?.items || []
      const grouped: Record<string, ReadyItem> = {}
      items.forEach((item: any) => {
        const cid = item.customer_id || 'no-customer'
        if (!grouped[cid]) {
          grouped[cid] = {
            customer_id: cid,
            customer_name: item.customer_name || 'Müşteri Seçilmemiş',
            customer_code: item.customer_code || '-',
            count: 0
          }
        }
        grouped[cid].count++
      })
      setReadyItems(Object.values(grouped))
    } else {
      setShipments(shipmentsData ?? [])
    }
  }, [filterStatus, readyItemsData, shipmentsData])

  useEffect(() => {
    if (filterStatus === 'ready' && selectedReadyCustomerId) {
      setReadyProducts(readyProductsData?.items || [])
    }
  }, [filterStatus, selectedReadyCustomerId, readyProductsData])

  async function loadCustomers() {
    try {
      const data = await fetchApi('/api/accounts?type=customer')
      setCustomers(Array.isArray(data) ? data : [])
    } catch (error) { console.error(error) }
  }

  const executeClearShipmentData = async () => {
    setConfirmClearShipment(false)
    setClearingShipmentData(true)
    try {
      await fetchApi('/api/admin/clear-shipment-data', { method: 'POST', body: JSON.stringify({ confirm: true }) })
      toast.success('Sevkiyat verileri temizlendi.')
      mutateShipments()
    } catch (e) { toast.error('İşlem başarısız') }
    finally { setClearingShipmentData(false) }
  }

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'delivered': return { color: 'success', text: 'TESLİM EDİLDİ', icon: CheckCircle }
      case 'in_transit': return { color: 'primary', text: 'YOLDA', icon: Truck }
      case 'cancelled': return { color: 'error', text: 'İPTAL EDİLDİ', icon: XCircle }
      default: return { color: 'warning', text: 'BEKLEMEDE', icon: Clock }
    }
  }

  return (
    <AppDashboardLayout
      title="Sevkiyat Yönetimi"
      subtitle="Sevkiyat fişleri, takibi ve planlaması"
      icon={Truck}
      actions={
        <div className="flex flex-wrap gap-3">
           <Button variant="outline" size="sm" onClick={() => setConfirmClearShipment(true)} disabled={clearingShipmentData} className="text-red-400 border-red-500/20 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4 mr-2" />
              Verileri Temizle
           </Button>
           <Button variant="solid" color="primary" size="sm" onClick={() => router.push('/shipments/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Yeni Sevkiyat
           </Button>
        </div>
      }
    >
      <ConfirmDialog
        isOpen={confirmClearShipment}
        onClose={() => setConfirmClearShipment(false)}
        onConfirm={executeClearShipmentData}
        title="Sevkiyat Verilerini Sil"
        message='Sevkiyata verilmiş tüm barkodlar sevkiyattan çıkarılacak. Emin misiniz?'
        variant="danger"
      />

      <div className="space-y-6 animate-reveal">
         {/* Stats Row */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Oluşturulan', val: shipmentsData?.length || 0, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Sevk Edilen', val: shipmentsData?.filter(s => s.status === 'delivered').length || 0, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Yoldaki', val: shipmentsData?.filter(s => s.status === 'in_transit').length || 0, icon: Truck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Bekleyen', val: readyItems.length, icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' }
            ].map((stat, i) => (
              <ZenithCard key={i} glow className="group overflow-hidden border-white/5 hover:border-primary/30 transition-all">
                 <div className="flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                       <p className="text-3xl font-black text-white tracking-tighter">{stat.val}</p>
                    </div>
                    <div className={cn("p-4 rounded-2xl border border-white/5 shadow-inner transition-transform group-hover:scale-110", stat.bg)}>
                       <stat.icon className={cn("w-6 h-6", stat.color)} />
                    </div>
                 </div>
              </ZenithCard>
            ))}
         </div>

         {/* Zenith Logistics Intelligence */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-reveal">
            <div className="lg:col-span-2">
               <ZenithCard className="h-full border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
                  <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                           <Activity className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                           <h3 className="text-sm font-black text-white uppercase tracking-widest">LOJİSTİK VERİMLİLİK MATRİSİ</h3>
                           <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mt-0.5">Operasyonel Sevkiyat ve Transit Analizi</p>
                        </div>
                     </div>
                     <Badge variant="glass" className="bg-primary/10 border-primary/20 text-primary font-black text-[9px] px-4">LOJİSTİK OPTİMİZE</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="space-y-4">
                        <div className="flex items-center gap-2">
                           <Clock className="w-4 h-4 text-cyan-500 opacity-40" />
                           <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Ort. Teslim Süresi</span>
                        </div>
                        <div className="space-y-1">
                           <p className="text-2xl font-black text-white italic">2.4 GÜN</p>
                           <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">-0.5 GÜN İYİLEŞME</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="flex items-center gap-2">
                           <CheckCircle className="w-4 h-4 text-emerald-500 opacity-40" />
                           <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Teslimat Başarısı</span>
                        </div>
                        <div className="space-y-1">
                           <p className="text-2xl font-black text-white italic">%98.8</p>
                           <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Sıfır Hasarlı Teslim</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="flex items-center gap-2">
                           <TrendingUp className="w-4 h-4 text-primary opacity-40" />
                           <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Kapasite Doluluk</span>
                        </div>
                        <div className="space-y-1">
                           <p className="text-2xl font-black text-white italic">%84.2</p>
                           <p className="text-[9px] font-bold text-cyan-500 uppercase tracking-widest">ARAÇ DOLULUK ORANI</p>
                        </div>
                     </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/[0.05] flex items-center justify-between">
                     <p className="text-[10px] font-bold text-white/20 italic">Hub AI: Mevcut sevk edilebilir hacim 3 tam araç kapasitesine ulaştı. Rota planlanıyor.</p>
                     <Button variant="ghost" size="xs" className="text-cyan-400 font-black text-[9px] hover:bg-cyan-500/10">BÖLGESEL DAĞILIM <ArrowRight className="w-3 h-3 ml-2" /></Button>
                  </div>
               </ZenithCard>
            </div>

            <div>
               <ZenithCard className="h-full border-white/5 bg-black/40">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Info className="w-4 h-4 text-orange-500" />
                     </div>
                     <h3 className="text-[11px] font-black text-white uppercase tracking-widest">KRİTİK TERMİNLER</h3>
                  </div>
                  <div className="space-y-4">
                     <div className="p-3 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shadow-[0_0_8px_#f97316]" />
                        <div>
                           <p className="text-[11px] font-black text-white uppercase tracking-tight">MARMARA BÖLGESİ</p>
                           <p className="text-[9px] font-bold text-white/30 uppercase mt-0.5">12 Sipariş Beklemede</p>
                        </div>
                     </div>
                     <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shadow-[0_0_8px_#3b82f6]" />
                        <div>
                           <p className="text-[11px] font-black text-white uppercase tracking-tight">EGE BÖLGESİ</p>
                           <p className="text-[9px] font-bold text-white/30 uppercase mt-0.5">8 Sipariş Sevk Bekliyor</p>
                        </div>
                     </div>
                  </div>
                  <div className="mt-6">
                     <Button className="w-full h-10 bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-xl">
                        ROTALARI YÖNET
                     </Button>
                  </div>
               </ZenithCard>
            </div>
         </div>

         {/* Filters Card - Zenith Platinum */}
         <ZenithCard className="p-4 flex flex-col md:flex-row items-center gap-4 bg-white/[0.02] border-white/5 animate-reveal" style={{ animationDelay: '100ms' }}>
            <div className="relative flex-1 group w-full">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
               <Input 
                 placeholder="Sevk No veya Müşteri Ara..." 
                 className="pl-12 w-full h-12 bg-white/5 border-white/10 group-hover:border-white/20 focus:border-primary/50 transition-all font-bold rounded-2xl" 
               />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
               <select 
                 value={filterStatus}
                 onChange={(e) => setFilterStatus(e.target.value)}
                 className="h-12 bg-white/5 border border-white/10 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest text-white/60 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer appearance-none min-w-[160px]"
               >
                  <option value="all">TÜM DURUMLAR</option>
                  <option value="pending">BEKLEMEDE</option>
                  <option value="in_transit">YOLDA</option>
                  <option value="delivered">TESLİM EDİLDİ</option>
                  <option value="ready">SEVK EDİLEBİLİR</option>
               </select>
               <select 
                 value={filterCustomer}
                 onChange={(e) => setFilterCustomer(e.target.value)}
                 className="h-12 bg-white/5 border border-white/10 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest text-white/60 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer appearance-none min-w-[180px]"
               >
                  <option value="all">TÜM MÜŞTERİLER</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
               </select>
               <Button variant="ghost" className="h-12 w-12 bg-white/5 border-white/10 hover:bg-white/10 rounded-2xl p-0">
                  <Filter className="w-5 h-5 text-primary" />
               </Button>
            </div>
         </ZenithCard>

         {/* Main Content Area */}
         {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 animate-pulse">
               <div className="text-center opacity-40 font-black uppercase tracking-widest">Veriler Yükleniyor...</div>
            </div>
         ) : filterStatus === 'ready' ? (
                  /* Ready to Ship View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {readyItems.length === 0 ? (
                  <div className="col-span-full py-20 text-center opacity-20 font-black uppercase tracking-widest">Sevk edilebilir ürün bulunamadı</div>
               ) : (
                  readyItems.map((item) => (
                    <ZenithCard 
                      key={item.customer_id} 
                      glow 
                      className="hover:border-primary/50 transition-all cursor-pointer group p-0 overflow-hidden" 
                      onClick={() => router.push(`/shipments/new?customerId=${item.customer_id}`)}
                    >
                       <div className="p-6 bg-white/[0.02]">
                          <div className="flex items-start justify-between mb-6">
                             <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-glow-sm">
                                <User className="w-6 h-6 text-primary" />
                             </div>
                             <Badge color="primary" variant="soft" className="px-4 py-1.5 font-black text-[10px] uppercase tracking-widest border border-primary/20">
                                {item.count} ÜRÜN HAZIR
                             </Badge>
                          </div>
                          <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors tracking-tight uppercase">{item.customer_name}</h3>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-2">{item.customer_code}</p>
                       </div>
                       <div className="px-6 py-4 bg-primary/5 flex items-center justify-between text-primary font-black text-[10px] uppercase tracking-[0.2em]">
                          <span>Sevkiyat Portalı</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                       </div>
                    </ZenithCard>
                  ))
               )}
            </div>
         ) : (
            /* Shipments List View */
            <div className="space-y-4">
               {shipments.length === 0 ? (
                  <div className="py-20 text-center opacity-20 font-black uppercase tracking-widest">Sevkiyat kaydı bulunamadı</div>
               ) : (
                  shipments.map((shipment) => {
                    const status = getStatusInfo(shipment.status)
                    return (
                      <ZenithCard 
                        key={shipment.id} 
                        className="hover:bg-white/[0.04] transition-all cursor-pointer group p-0 overflow-hidden border-white/5" 
                        onClick={() => router.push(`/shipments/${shipment.id}`)}
                      >
                         <div className="flex flex-col md:flex-row items-center p-5 gap-6 relative">
                            <div className={cn("w-1.5 h-14 rounded-full absolute left-0 shadow-glow", 
                              status.color === 'success' ? 'bg-emerald-500' : 
                              status.color === 'primary' ? 'bg-primary' : 
                              status.color === 'error' ? 'bg-red-500' : 'bg-amber-500'
                            )} />
                            
                            <div className="flex-1 min-w-0 ml-4">
                               <div className="flex items-center gap-4 mb-2">
                                  <p className="text-xs font-black text-primary font-mono tracking-wider">#{shipment.shipment_number}</p>
                                  <Badge color={status.color as any} variant="soft" className="text-[9px] font-black px-2.5 py-1 uppercase tracking-widest border border-current/10">
                                     {status.text}
                                  </Badge>
                               </div>
                               <h4 className="font-black text-xl text-white truncate uppercase tracking-tight">{shipment.customer_name}</h4>
                               <div className="flex items-center gap-6 mt-2">
                                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center">
                                    <Calendar className="w-3.5 h-3.5 mr-2 text-primary/50" />
                                    {formatDate(shipment.shipment_date)}
                                  </span>
                                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center">
                                    <Package className="w-3.5 h-3.5 mr-2 text-primary/50" />
                                    {shipment.total_quantity} BİRİM
                                  </span>
                               </div>
                            </div>
 
                            <div className="flex items-center gap-4 pr-2">
                               {shipment.invoice_id ? (
                                  <Button variant="outline" size="sm" className="text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 font-black text-[9px] uppercase tracking-widest" onClick={(e) => { e.stopPropagation(); router.push(`/invoices/${shipment.invoice_id}`)}}>
                                     <FileText className="w-4 h-4 mr-2" />
                                     Fatura Görüntüle
                                  </Button>
                               ) : (
                                  <Button variant="ghost" size="sm" className="text-white/20 hover:text-primary font-black text-[9px] uppercase tracking-widest transition-colors" onClick={(e) => { e.stopPropagation(); router.push(`/invoices/new?shipmentId=${shipment.id}`)}}>
                                     Fatura Oluştur
                                  </Button>
                               )}
                               <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all border border-white/5 shadow-glow-sm">
                                  <ChevronRight className="w-5 h-5" />
                               </div>
                            </div>
                         </div>
                      </ZenithCard>
                    )
                  })
               )}
            </div>
         )}
      </div>
    </AppDashboardLayout>
  )
}
