'use client'

import { useState, useEffect, useMemo, use } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft,
  ShoppingCart,
  Calendar,
  Truck,
  User,
  Package,
  MapPin,
  Activity,
  Layers,
  Settings,
  Info,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Pencil,
  Trash2,
  Share2,
  Printer,
  ChevronRight,
  Factory,
  Database,
  History
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { fetchApi, useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { formatDate } from '@/lib/utils/dateFormat'
import { cn } from '@/lib/cn'

interface OrderDetail {
  id: string
  order_number: string
  dealer_name: string | null
  customer_name: string | null
  customer_code: string | null
  product_name: string
  product_sku: string | null
  product_id: string | null
  quantity: number
  unit_price: number
  total_amount: number
  order_date: string | null
  delivery_date: string | null
  status: 'pending' | 'in_production' | 'completed' | 'cancelled'
  production_order_id: string | null
  production_order_number: string | null
  production_status: string | null
  notes: string | null
  configuration: string | null
  created_at: string
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const { data: order, isLoading, mutate, error } = useApi<OrderDetail>(id ? `/api/orders/${id}` : null)

  const parseNotes = (notes: string | null) => {
    if (!notes) return []
    return notes.split('|').map(s => s.trim()).filter(Boolean)
  }

  const timeline = useMemo(() => {
    if (!order) return []
    return [
      { label: 'Sipariş Oluşturuldu', date: order.created_at, status: 'completed', icon: ShoppingCart },
      { label: 'Sipariş Onaylandı', date: order.order_date, status: order.status !== 'pending' ? 'completed' : 'pending', icon: CheckCircle },
      { label: 'Üretime Alındı', date: null, status: order.status === 'in_production' || order.status === 'completed' ? 'completed' : 'pending', icon: Factory },
      { label: 'Tamamlandı / Sevk', date: order.delivery_date, status: order.status === 'completed' ? 'completed' : 'pending', icon: Truck },
    ]
  }, [order])

  if (isLoading) {
    return (
      <AppDashboardLayout title="Sipariş Detayı" icon={ShoppingCart}>
        <div className="flex items-center justify-center p-20 animate-pulse">
           <div className="text-center opacity-40 font-black uppercase tracking-widest">Sipariş Bilgileri Yükleniyor...</div>
        </div>
      </AppDashboardLayout>
    )
  }

  if (error || !order) {
    return (
      <AppDashboardLayout title="Hata" icon={AlertCircle}>
        <div className="max-w-md mx-auto p-10 text-center space-y-4">
           <AlertCircle className="w-16 h-16 text-error mx-auto opacity-20" />
           <h2 className="text-xl font-black">Sipariş bulunamadı</h2>
           <p className="text-sm text-foreground/40">Görüntülemek istediğiniz sipariş mevcut değil veya silinmiş olabilir.</p>
           <Button variant="solid" color="primary" onClick={() => router.push('/orders')}>
              Listeye Dön
           </Button>
        </div>
      </AppDashboardLayout>
    )
  }

  return (
    <AppDashboardLayout
      title={`Sipariş: ${order.order_number}`}
      subtitle={`${order.dealer_name || 'Genel Müşteri'} • ${order.product_name}`}
      icon={ShoppingCart}
      actions={
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" onClick={() => router.push('/orders')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri Dön
           </Button>
           <Button variant="soft" color="primary" size="sm">
              <Pencil className="w-4 h-4 mr-2" />
              Düzenle
           </Button>
           <Button variant="glass" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Yazdır
           </Button>
        </div>
      }
    >
      <div className="space-y-6 animate-reveal">
         {/* Status Progress Bar */}
         <Card variant="glass" className="overflow-hidden border-primary/20 bg-primary/5">
            <CardBody className="p-8">
               <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative">
                  {/* Timeline Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 hidden md:block" />
                  
                  {timeline.map((step, i) => (
                    <div key={i} className="relative z-10 flex flex-col items-center flex-1">
                       <div className={cn(
                         "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                         step.status === 'completed' ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110" : "bg-white/5 text-foreground/20 border border-white/5"
                       )}>
                          <step.icon className="w-6 h-6" />
                       </div>
                       <p className={cn(
                         "mt-4 text-[10px] font-black uppercase tracking-widest text-center",
                         step.status === 'completed' ? "text-foreground" : "text-foreground/20"
                       )}>{step.label}</p>
                       <p className="text-[10px] text-foreground/40 mt-1 font-mono">{step.date ? formatDate(step.date) : '--/--/--'}</p>
                    </div>
                  ))}
               </div>
            </CardBody>
         </Card>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info Column */}
            <div className="lg:col-span-2 space-y-6">
               <Card variant="glass">
                  <CardHeader className="border-b border-white/5 p-6 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-primary" />
                        <h3 className="font-black uppercase tracking-widest text-sm">Ürün Detayları</h3>
                     </div>
                     <Badge color={order.status === 'completed' ? 'success' : order.status === 'in_production' ? 'secondary' : 'warning'}>
                        {order.status.toUpperCase()}
                     </Badge>
                  </CardHeader>
                  <CardBody className="p-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                                 <Layers className="w-5 h-5 text-foreground/40" />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Ürün Adı / SKU</p>
                                 <p className="font-black text-lg">{order.product_name}</p>
                                 <p className="font-mono text-xs text-primary">{order.product_sku || 'SKU-YOK'}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                                 <Activity className="w-5 h-5 text-foreground/40" />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Miktar / Birim</p>
                                 <p className="font-black text-lg tracking-tight">{order.quantity} <span className="text-sm text-foreground/30 ml-1 uppercase">ADET</span></p>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                                 <Calendar className="w-5 h-5 text-foreground/40" />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Sipariş Tarihi</p>
                                 <p className="font-black text-lg">{order.order_date ? formatDate(order.order_date) : '-'}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                                 <Truck className="w-5 h-5 text-foreground/40" />
                              </div>
                              <div>
                                 <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Teslimat Hedefi</p>
                                 <p className="font-black text-lg">{order.delivery_date ? formatDate(order.delivery_date) : '-'}</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Multi-line Configuration if exists */}
                     {order.configuration && (
                        <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5">
                           <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-2">Konfigürasyon</p>
                           <p className="text-sm font-medium leading-relaxed">{order.configuration}</p>
                        </div>
                     )}
                  </CardBody>
               </Card>

               {/* Notes & Features */}
               <Card variant="glass">
                  <CardHeader className="border-b border-white/5 p-6">
                     <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-primary" />
                        <h3 className="font-black uppercase tracking-widest text-sm">Özellikler & Detaylar</h3>
                     </div>
                  </CardHeader>
                  <CardBody className="p-6">
                     <div className="flex flex-wrap gap-3">
                        {parseNotes(order.notes).length > 0 ? (
                          parseNotes(order.notes).map((note, idx) => {
                             const isHighlight = note.includes('Kumaş') || note.includes('Kasa') || note.includes('Ayak');
                             return (
                               <Badge 
                                 key={idx} 
                                 variant={isHighlight ? 'soft' : 'glass'} 
                                 color={isHighlight ? 'primary' : 'secondary'}
                                 className="px-4 py-1.5 text-xs font-bold rounded-xl"
                               >
                                 {note}
                               </Badge>
                             )
                          })
                        ) : (
                          <div className="w-full p-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
                             <Info className="w-8 h-8 text-foreground/20 mx-auto mb-3" />
                             <p className="text-foreground/40 text-sm font-medium">Bu sipariş için özel bir not bulunmuyor.</p>
                          </div>
                        )}
                     </div>
                  </CardBody>
               </Card>
            </div>

            {/* Sidebar Column */}
            <div className="space-y-6">
               {/* Dealer Info Card */}
               <Card variant="glass" className="bg-primary/5">
                  <CardHeader className="p-6 pb-2">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                           <User className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="font-black uppercase tracking-widest text-[10px] text-foreground/40">Müşteri Bilgileri</h3>
                     </div>
                  </CardHeader>
                  <CardBody className="p-6 space-y-6">
                     <div>
                        <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest leading-none mb-1">Bayi / Dealer</p>
                        <p className="text-xl font-black">{order.dealer_name || 'GENEL SATIŞ'}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest leading-none mb-1">Müşteri Adı</p>
                        <p className="text-lg font-black text-foreground/60">{order.customer_name || 'Belirtilmemiş'}</p>
                     </div>
                     <div className="flex items-center gap-2 pt-2">
                        <MapPin className="w-4 h-4 text-foreground/30" />
                        <span className="text-xs font-medium text-foreground/40">{order.customer_code || 'Müşteri Kodu Yok'}</span>
                     </div>
                  </CardBody>
               </Card>

               {/* Production Link Card */}
               {order.production_order_id && (
                  <Card variant="glass" className="hover:border-primary/50 transition-all cursor-pointer group" onClick={() => router.push(`/production/${order.production_order_id}`)}>
                     <CardBody className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="p-3 bg-secondary/10 rounded-xl">
                              <Factory className="w-6 h-6 text-secondary" />
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest">Üretim Emri</p>
                              <p className="font-black font-mono">{order.production_order_number || 'TRK-00234'}</p>
                           </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-foreground/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                     </CardBody>
                  </Card>
               )}

               {/* Quick Actions Sidebar */}
               <Card variant="glass">
                  <CardBody className="p-2 space-y-1">
                     <Button fullWidth variant="ghost" className="justify-start px-4 h-12 hover:bg-white/5 group">
                        <Share2 className="w-4 h-4 mr-3 text-foreground/30 group-hover:text-primary" />
                        Siparişi Paylaş
                     </Button>
                     <Button fullWidth variant="ghost" className="justify-start px-4 h-12 hover:bg-white/5 group">
                        <Database className="w-4 h-4 mr-3 text-foreground/30 group-hover:text-primary" />
                        Log Kayıtlarını Gör
                     </Button>
                     <Button fullWidth variant="ghost" className="justify-start px-4 h-12 hover:bg-red-500/5 group text-red-500/60 hover:text-red-500">
                        <Trash2 className="w-4 h-4 mr-3 opacity-50 group-hover:opacity-100" />
                        Siparişi Sil
                     </Button>
                  </CardBody>
               </Card>

               {/* Activity Log Preview */}
               <div className="px-2">
                  <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest flex items-center gap-2 mb-4">
                     <History className="w-3 h-3" />
                     Son Hareketler
                  </p>
                  <div className="space-y-4 border-l-2 border-white/5 ml-1.5 pl-4">
                     {[
                       { title: 'Excel aktarımı ile oluşturuldu', time: 'Dün, 14:20' },
                       { title: 'Üretim listesine eklendi', time: 'Dün, 15:45' }
                     ].map((log, i) => (
                       <div key={i} className="relative">
                          <div className="absolute top-1.5 -left-[21px] w-2.5 h-2.5 rounded-full bg-white/10" />
                          <p className="text-[11px] font-bold text-foreground/60 leading-tight">{log.title}</p>
                          <p className="text-[10px] text-foreground/20 font-medium mt-1 uppercase tracking-tighter">{log.time}</p>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
    </AppDashboardLayout>
  )
}
