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
  Info
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
        <div className="flex items-center gap-2">
           <Button variant="glass" size="sm" onClick={() => setConfirmClearShipment(true)} disabled={clearingShipmentData} color="error">
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
              { label: 'Sevk Edilen', val: shipmentsData?.filter(s => s.status === 'delivered').length || 0, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
              { label: 'Yoldaki', val: shipmentsData?.filter(s => s.status === 'in_transit').length || 0, icon: Truck, color: 'text-warning', bg: 'bg-warning/10' },
              { label: 'Bekleyen', val: readyItems.length, icon: Activity, color: 'text-secondary', bg: 'bg-secondary/10' }
            ].map((stat, i) => (
              <Card key={i} variant="glass" className="hover:scale-[1.02] transition-transform">
                 <CardBody className="p-6 flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">{stat.label}</p>
                       <p className="text-3xl font-black">{stat.val}</p>
                    </div>
                    <div className={cn("p-4 rounded-2xl", stat.bg)}>
                       <stat.icon className={cn("w-6 h-6", stat.color)} />
                    </div>
                 </CardBody>
              </Card>
            ))}
         </div>

         {/* Filters Card */}
         <Card variant="glass">
            <CardBody className="p-4 flex flex-col md:flex-row items-center gap-4">
               <div className="relative flex-1 group w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Sevk No veya Müşteri Ara..." 
                    className="pl-12 w-full" 
                    variant="filled"
                  />
               </div>
               <div className="flex items-center gap-2 w-full md:w-auto">
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
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
                    className="bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                  >
                     <option value="all">TÜM MÜŞTERİLER</option>
                     {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
            </CardBody>
         </Card>

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
                    <Card key={item.customer_id} variant="glass" className="hover:border-primary/50 transition-all cursor-pointer group" onClick={() => router.push(`/shipments/new?customerId=${item.customer_id}`)}>
                       <CardBody className="p-6">
                          <div className="flex items-start justify-between mb-4">
                             <div className="p-3 bg-primary/10 rounded-2xl">
                                <User className="w-6 h-6 text-primary" />
                             </div>
                             <Badge color="primary" variant="soft" className="px-3 py-1 font-black">
                                {item.count} ÜRÜN
                             </Badge>
                          </div>
                          <h3 className="text-lg font-black group-hover:text-primary transition-colors">{item.customer_name}</h3>
                          <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mt-1">{item.customer_code}</p>
                          <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between text-primary font-black text-[10px] uppercase tracking-widest">
                             <span>Sevkiyat Oluştur</span>
                             <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                       </CardBody>
                    </Card>
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
                      <Card key={shipment.id} variant="glass" className="hover:bg-white/[0.02] transition-all cursor-pointer group" onClick={() => router.push(`/shipments/${shipment.id}`)}>
                         <CardBody className="p-0">
                            <div className="flex flex-col md:flex-row items-center p-4 gap-6 relative">
                               <div className={cn("w-1.5 h-12 rounded-full absolute left-0", 
                                 status.color === 'success' ? 'bg-emerald-500' : 
                                 status.color === 'primary' ? 'bg-primary' : 
                                 status.color === 'error' ? 'bg-red-500' : 'bg-amber-500'
                               )} />
                               
                               <div className="flex-1 min-w-0 ml-4">
                                  <div className="flex items-center gap-3 mb-1">
                                     <p className="text-sm font-black text-primary font-mono">{shipment.shipment_number}</p>
                                     <Badge color={status.color as any} variant="soft" className="text-[9px] font-black px-2 py-0.5">
                                        {status.text}
                                     </Badge>
                                  </div>
                                  <h4 className="font-black text-lg truncate uppercase">{shipment.customer_name}</h4>
                                  <div className="flex items-center gap-4 mt-1">
                                     <span className="text-[10px] font-black text-foreground/30 uppercase tracking-widest flex items-center">
                                       <Calendar className="w-3 h-3 mr-1" />
                                       {formatDate(shipment.shipment_date)}
                                     </span>
                                     <span className="text-[10px] font-black text-foreground/30 uppercase tracking-widest flex items-center">
                                       <Package className="w-3 h-3 mr-1" />
                                       {shipment.total_quantity} ADET
                                     </span>
                                  </div>
                               </div>

                               <div className="flex items-center gap-3 pr-2">
                                  {shipment.invoice_id ? (
                                     <Button variant="soft" color="success" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/invoices/${shipment.invoice_id}`)}}>
                                        <FileText className="w-4 h-4 mr-2" />
                                        Fatura
                                     </Button>
                                  ) : (
                                     <Button variant="ghost" size="sm" className="opacity-40 hover:opacity-100" onClick={(e) => { e.stopPropagation(); router.push(`/invoices/new?shipmentId=${shipment.id}`)}}>
                                        Fatura Kes
                                     </Button>
                                  )}
                                  <Button variant="glass" size="icon" className="group-hover:bg-primary group-hover:text-white transition-all">
                                     <ChevronRight className="w-5 h-5" />
                                  </Button>
                               </div>
                            </div>
                         </CardBody>
                      </Card>
                    )
                  })
               )}
            </div>
         )}
      </div>
    </AppDashboardLayout>
  )
}
