'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Truck, 
  User, 
  Package, 
  Plus, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Search, 
  Barcode, 
  ArrowLeft, 
  Save, 
  Info,
  ChevronRight,
  Activity,
  History,
  ShoppingCart
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { fetchApi, useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { useAuthStore } from '@/lib/store/authStore'
import { cn } from '@/lib/cn'

interface Customer {
  id: string
  name: string
  code: string
}

interface ReadyItem {
  product_id: string
  production_order_id: string | null
  production_order_number?: string | null
  product_name: string
  product_sku: string
  total_count: number
  total_barcodes_in_po: number
  items: Array<{
    id: string
    barcode: string
    serial_number: string
    production_order_number?: string
  }>
  already_shipped?: Array<{
    barcode: string
    shipment_date: string
    product_name: string
    product_sku?: string | null
    configuration?: string | null
  }>
}

interface ShipmentItem {
  product_id: string
  production_order_id: string | null
  production_order_number?: string | null
  product_name: string
  product_sku: string
  quantity: number
  barcodes: string[]
  required_count: number
}

function itemKey(item: { product_id: string; production_order_id?: string | null }) {
  return `${item.product_id}\n${item.production_order_id ?? ''}`
}

export default function NewShipmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(searchParams.get('customerId') || '')
  const [readyItems, setReadyItems] = useState<ReadyItem[]>([])
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([])
  const [errorHeader, setErrorHeader] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [partialShipmentReason, setPartialShipmentReason] = useState('')
  const userRole = useAuthStore((state) => state.user?.role ?? null)
  const isUserAdmin = userRole === 'admin' || userRole === 'manager' || userRole?.toString().toLowerCase().includes('yonetici')

  const { data: customersData } = useApi<Customer[]>('/api/accounts?type=customer')
  useEffect(() => { setCustomers(customersData ?? []) }, [customersData])

  const readyItemsKey = useMemo(() => selectedCustomerId ? `/api/shipments/ready-items?customer_id=${selectedCustomerId}` : null, [selectedCustomerId])
  const { data: readyItemsData, isLoading } = useApi<{ items: ReadyItem[] }>(readyItemsKey)
  const pendingScansRef = useRef<string[]>([])

  const readyBarcodeIndex = useMemo(() => {
    const map = new Map<string, { product_id: string; production_order_id: string | null; product_name: string }>()
    readyItems.forEach((item) => {
      item.items.forEach((barcodeItem) => {
        map.set(barcodeItem.barcode, {
          product_id: item.product_id,
          production_order_id: item.production_order_id ?? null,
          product_name: item.product_name,
        })
      })
    })
    return map
  }, [readyItems])

  useEffect(() => {
    if (!readyItemsData?.items) return
    setReadyItems(readyItemsData.items)
    setShipmentItems(readyItemsData.items.map((item) => ({
      product_id: item.product_id,
      production_order_id: item.production_order_id ?? null,
      production_order_number: item.production_order_number ?? undefined,
      product_name: item.product_name,
      product_sku: item.product_sku,
      quantity: item.total_count,
      barcodes: [],
      required_count: item.total_barcodes_in_po ?? item.total_count,
    })))
  }, [readyItemsData])

  useEffect(() => {
    const onScan = (event: Event) => {
      const detail = (event as CustomEvent).detail as { barcode?: string }
      if (detail?.barcode) handleGlobalScan(detail.barcode)
    }
    window.addEventListener('barcode:scanned', onScan as EventListener)
    return () => window.removeEventListener('barcode:scanned', onScan as EventListener)
  }, [selectedCustomerId, shipmentItems])

  async function handleGlobalScan(barcode: string) {
    if (!barcode) return
    try {
      const response = await fetch(`/api/shipments/ready-items?barcode=${encodeURIComponent(barcode)}`)
      if (!response.ok) {
         toast.error("Barkod sevke hazır değil!")
         return
      }
      const payload = await response.json()
      const item = payload.data?.item || payload.item
      if (!item?.product_id) return

      if (!selectedCustomerId && item.customer_id) {
        setSelectedCustomerId(item.customer_id)
      } else if (selectedCustomerId && item.customer_id && item.customer_id !== selectedCustomerId) {
        setErrorHeader('Barkod farklı müşteriye ait!')
        return
      }
      handleBarcodeInput(item.product_id, item.production_order_id ?? null, barcode)
    } catch (e) { }
  }

  function handleBarcodeInput(productId: string, productionOrderId: string | null, barcode: string) {
    const cleaned = barcode.trim()
    const indexed = readyBarcodeIndex.get(cleaned)
    if (!indexed) { toast.error("Hatalı Barkod!"); return }

    setShipmentItems(items => items.map(item => {
      if (item.product_id === productId && (item.production_order_id ?? '') === (productionOrderId ?? '')) {
        if (item.barcodes.includes(cleaned)) return item
        toast.info(`${cleaned} eklendi`)
        return { ...item, barcodes: [...item.barcodes, cleaned] }
      }
      return item
    }))
  }

  const isPartialShipment = useMemo(() => shipmentItems.some(i => i.barcodes.length > 0 && i.barcodes.length < i.required_count), [shipmentItems])

  async function handleCreateShipment() {
    if (isPartialShipment && !partialShipmentReason.trim()) {
       toast.warning("Kısmi sevk açıklaması zorunludur!")
       return
    }
    setIsSubmitting(true)
    try {
      const activeItems = shipmentItems.filter(i => i.barcodes.length > 0)
      if (activeItems.length === 0) throw new Error("Henüz ürün okutulmadı")

      await fetchApi('/api/shipments', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          shipment_date: new Date().toISOString().split('T')[0],
          items: activeItems.map(i => ({ product_id: i.product_id, quantity: i.barcodes.length, barcodes: i.barcodes })),
          notes: 'Platinum Modern Sevk',
          partial_shipment_reason: isPartialShipment ? partialShipmentReason : null
        })
      })
      toast.success("Sevkiyat oluşturuldu!")
      router.push('/shipments')
    } catch (e: any) { toast.error(e.message) }
    finally { setIsSubmitting(false) }
  }

  return (
    <AppDashboardLayout
      title="Yeni Sevkiyat Oluştur"
      subtitle="Ürünleri okutarak Sevkiyat planlayın"
      icon={Truck}
      actions={
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" onClick={() => router.push('/shipments')}>
              <X className="w-4 h-4 mr-2" />
              Vazgeç
           </Button>
           <Button color="primary" size="sm" onClick={handleCreateShipment} disabled={isSubmitting || shipmentItems.every(i => i.barcodes.length === 0)}>
              <Save className="w-4 h-4 mr-2" />
              Sevkiyatı Tamamla
           </Button>
        </div>
      }
    >
      <div className="max-w-5xl mx-auto space-y-6 animate-reveal">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
               {/* Search & Customer Selection */}
               <Card variant="glass" className="bg-primary/5 border-primary/20">
                  <CardBody className="p-6">
                     <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                           <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest ml-1">Cari / Müşteri Seçimi</label>
                           <select 
                             value={selectedCustomerId}
                             onChange={(e) => setSelectedCustomerId(e.target.value)}
                             disabled={!isUserAdmin && selectedCustomerId !== ''}
                             className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer disabled:opacity-50"
                           >
                              <option value="">LÜTFEN MÜŞTERİ SEÇİN...</option>
                              {customers.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                           </select>
                        </div>
                        <div className="md:w-64 space-y-2">
                           <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest ml-1">Hızlı Barkod Girişi</label>
                           <div className="relative">
                              <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                              <Input 
                                placeholder="Barkod Okut..." 
                                className="pl-12"
                                variant="filled"
                                onKeyPress={e => {
                                   if (e.key === 'Enter') {
                                      handleGlobalScan(e.currentTarget.value)
                                      e.currentTarget.value = ''
                                   }
                                }}
                              />
                           </div>
                        </div>
                     </div>
                  </CardBody>
               </Card>

               {/* Ready Products List */}
               {selectedCustomerId ? (
                  <div className="space-y-4">
                     {isLoading ? (
                        <div className="text-center p-20 opacity-40 font-black uppercase tracking-widest animate-pulse">Ürünler Hazırlanıyor...</div>
                     ) : shipmentItems.length === 0 ? (
                        <div className="text-center p-20 bg-white/5 rounded-3xl border border-dashed border-white/5">
                           <Info className="w-12 h-12 mx-auto mb-4 opacity-10" />
                           <p className="text-sm font-bold text-foreground/30 uppercase tracking-widest">Sevk edilebilir ürün bulunamadı</p>
                        </div>
                     ) : (
                        shipmentItems.map((item, idx) => {
                           const readyData = readyItems.find(ri => itemKey(ri) === itemKey(item))
                           const isComplete = item.barcodes.length >= item.required_count
                           return (
                              <Card key={idx} variant="glass" className={cn("overflow-hidden transition-all", item.barcodes.length > 0 ? "border-primary/50" : "opacity-70")}>
                                 <CardBody className="p-0">
                                    <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                       <div className="min-w-0">
                                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{item.production_order_number || 'STOKTAN SEVK'}</p>
                                          <h4 className="font-black text-lg truncate uppercase">{item.product_name}</h4>
                                          <div className="flex items-center gap-3 mt-1">
                                             <Badge variant="glass" className="font-mono text-[9px]">{item.product_sku}</Badge>
                                             <span className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">
                                                Hedef: {item.required_count} • Okutulan: {item.barcodes.length}
                                             </span>
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-4 w-full md:w-auto">
                                          <div className="flex-1 md:w-32 h-2 bg-white/5 rounded-full overflow-hidden">
                                             <div 
                                               className="h-full bg-primary transition-all duration-500" 
                                               style={{ width: `${(item.barcodes.length / item.required_count) * 100}%` }} 
                                             />
                                          </div>
                                          {isComplete ? (
                                             <CheckCircle className="w-6 h-6 text-success shrink-0" />
                                          ) : (
                                             <Badge color="warning" className="shrink-0">{item.required_count - item.barcodes.length} KALDI</Badge>
                                          )}
                                       </div>
                                    </div>
                                    
                                    {/* Barcodes in this card */}
                                    <div className="px-6 pb-6 bg-white/[0.01]">
                                       <div className="flex flex-wrap gap-2">
                                          {readyData?.items.map(bi => {
                                             const isScanned = item.barcodes.includes(bi.barcode)
                                             return (
                                                <button 
                                                  key={bi.barcode}
                                                  onClick={() => handleBarcodeInput(item.product_id, item.production_order_id, bi.barcode)}
                                                  className={cn(
                                                    "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                                                    isScanned ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white/5 text-foreground/40 border-white/5 hover:bg-white/10"
                                                  )}
                                                >
                                                   {bi.barcode}
                                                </button>
                                             )
                                          })}
                                       </div>
                                    </div>
                                 </CardBody>
                              </Card>
                           )
                        })
                     )}
                  </div>
               ) : (
                  <div className="text-center p-20 bg-white/5 rounded-3xl border border-dashed border-white/10 flex flex-col items-center">
                     <User className="w-16 h-16 opacity-10 mb-6" />
                     <h3 className="font-black uppercase tracking-widest opacity-30 text-xl">Lütfen Müşteri Seçin</h3>
                     <p className="text-xs font-medium opacity-20 mt-2">Sevkiyata başlamak için bir cari hesap seçmeniz gerekiyor</p>
                  </div>
               )}
            </div>

            <div className="space-y-6">
               {/* Quick Info Sidebar */}
               <Card variant="glass" className="bg-secondary/5 border-secondary/20">
                  <CardHeader className="p-6 pb-2">
                     <h3 className="font-black uppercase tracking-widest text-[10px] text-foreground/40">Sevkiyat Özeti</h3>
                  </CardHeader>
                  <CardBody className="p-6 space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl">
                           <p className="text-[10px] font-black opacity-20 uppercase mb-1">Toplam Ürün</p>
                           <p className="text-2xl font-black">{shipmentItems.reduce((s, i) => s + i.barcodes.length, 0)}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl">
                           <p className="text-[10px] font-black opacity-20 uppercase mb-1">Kalem Sayısı</p>
                           <p className="text-2xl font-black">{shipmentItems.filter(i => i.barcodes.length > 0).length}</p>
                        </div>
                     </div>
                     
                     <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center gap-3 mb-3 text-warning">
                           <Info className="w-4 h-4" />
                           <h4 className="text-[10px] font-black uppercase tracking-widest">Otomatik Planlama</h4>
                        </div>
                        <p className="text-[11px] font-medium leading-relaxed opacity-40 italic">Bu sevkiyat onaylandığında ilgili üretim emirleri "Tamamlandı" durumuna geçecek ve cari hesap borçlandırılacaktır.</p>
                     </div>
                  </CardBody>
               </Card>

               {/* Partial Shipment Explanation */}
               {isPartialShipment && (
                  <Card variant="glass" className="bg-amber-500/5 border-amber-500/20 animate-reveal">
                     <CardBody className="p-6 space-y-4">
                        <div className="flex items-center gap-3 text-amber-500">
                           <AlertCircle className="w-5 h-5" />
                           <h4 className="text-xs font-black uppercase tracking-widest">Kısmi Sevk Açıklaması</h4>
                        </div>
                        <p className="text-[11px] font-bold opacity-60">Bazı ürünler tam okutulmadı. Bu durumu açıklamanız gerekiyor:</p>
                        <textarea 
                           className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all min-h-[100px]"
                           placeholder="Örn: Diğer 2 ürün başka araçla sevk edilecek..."
                           value={partialShipmentReason}
                           onChange={e => setPartialShipmentReason(e.target.value)}
                        />
                     </CardBody>
                  </Card>
               )}

               <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
                  <div className="flex items-center gap-3 mb-4">
                     <Activity className="w-5 h-5 text-primary" />
                     <h4 className="text-xs font-black uppercase tracking-widest">Gerekli Onaylar</h4>
                  </div>
                  <div className="space-y-3">
                     <div className="flex items-center justify-between text-[10px] font-black uppercase opacity-40">
                        <span>Müşteri Kontrolü</span>
                        <CheckCircle className="w-4 h-4 text-success" />
                     </div>
                     <div className="flex items-center justify-between text-[10px] font-black uppercase opacity-40">
                        <span>Stok Kontrolü</span>
                        <CheckCircle className="w-4 h-4 text-success" />
                     </div>
                     <div className="flex items-center justify-between text-[10px] font-black uppercase opacity-40">
                        <span>Risk/Limit Kontrolü</span>
                        <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </AppDashboardLayout>
  )
}
