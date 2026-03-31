'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
  CheckCircle,
  Plus,
  Save,
  X,
  ChevronRight,
  Search,
  Hash
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { fetchApi, useApi, getAuthHeaders } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/cn'

export default function NewOrderPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    order_number: `SIP-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
    dealer_name: '',
    customer_name: '',
    product_name: '',
    quantity: 1,
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthHeaders().Authorization.split(' ')[1]}`
        },
        body: JSON.stringify({
          ...formData,
          status: 'pending'
        })
      })

      if (res.ok) {
        toast.success('Sipariş başarıyla oluşturuldu')
        router.push('/orders')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Sipariş oluşturulamadı')
      }
    } catch (error) {
      toast.error('Sistem hatası oluştu')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppDashboardLayout
      title="Yeni Sipariş Oluştur"
      subtitle="Manuel sipariş girişi yapabilir veya Excel aktarımı kullanabilirsiniz"
      icon={ShoppingCart}
      actions={
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" onClick={() => router.push('/orders')}>
              <X className="w-4 h-4 mr-2" />
              İptal Et
           </Button>
           <Button variant="solid" color="primary" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Kaydediliyor...' : 'Siparişi Kaydet'}
           </Button>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto space-y-6 animate-reveal">
         <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {/* Left Column: Core Info */}
               <div className="md:col-span-2 space-y-6">
                  <Card variant="glass">
                     <CardHeader className="p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-primary/10 rounded-lg">
                              <Package className="w-4 h-4 text-primary" />
                           </div>
                           <h3 className="font-black uppercase tracking-widest text-sm">Ürün ve Miktar</h3>
                        </div>
                     </CardHeader>
                     <CardBody className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest ml-1">Ürün Adı / Modeli</label>
                              <Input 
                                 placeholder="Örn: Kansas Koltuk Takımı" 
                                 value={formData.product_name}
                                 onChange={e => setFormData({...formData, product_name: e.target.value})}
                                 variant="filled"
                                 required
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest ml-1">Miktar</label>
                              <Input 
                                 type="number"
                                 placeholder="1" 
                                 value={formData.quantity}
                                 onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                                 variant="filled"
                                 required
                                 min="1"
                              />
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest ml-1">Konfigürasyon / Detaylar</label>
                           <textarea 
                              className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[100px]"
                              placeholder="Kumaş kodu, ayak tipi, kasa detayları vb..."
                              value={formData.notes}
                              onChange={e => setFormData({...formData, notes: e.target.value})}
                           />
                        </div>
                     </CardBody>
                  </Card>

                  <Card variant="glass">
                     <CardHeader className="p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-secondary/10 rounded-lg">
                              <User className="w-4 h-4 text-secondary" />
                           </div>
                           <h3 className="font-black uppercase tracking-widest text-sm">Müşteri Bilgileri</h3>
                        </div>
                     </CardHeader>
                     <CardBody className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest ml-1">Bayi / Dealer Adı</label>
                              <Input 
                                 placeholder="Bayi seçin veya yazın..." 
                                 value={formData.dealer_name}
                                 onChange={e => setFormData({...formData, dealer_name: e.target.value})}
                                 variant="filled"
                                 required
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest ml-1">Müşteri / Son Kullanıcı</label>
                              <Input 
                                 placeholder="Müşteri adı ve soyadı..." 
                                 value={formData.customer_name}
                                 onChange={e => setFormData({...formData, customer_name: e.target.value})}
                                 variant="filled"
                              />
                           </div>
                        </div>
                     </CardBody>
                  </Card>
               </div>

               {/* Right Column: Settings & Meta */}
               <div className="space-y-6">
                  <Card variant="glass" className="bg-primary/5">
                     <CardHeader className="p-6 pb-2">
                        <h3 className="font-black uppercase tracking-widest text-[10px] text-foreground/40">Sistem Bilgileri</h3>
                     </CardHeader>
                     <CardBody className="p-6 space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest ml-1">Sipariş Numarası</label>
                           <Input 
                              value={formData.order_number}
                              onChange={e => setFormData({...formData, order_number: e.target.value})}
                              variant="filled"
                              disabled
                              className="font-mono text-primary font-bold opacity-70"
                           />
                           <p className="text-[9px] text-foreground/20 italic">Sistem tarafından otomatik üretilen referans no.</p>
                        </div>
                        
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest ml-1">Sipariş Tarihi</label>
                           <div className="relative">
                              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                              <Input 
                                 type="date"
                                 value={formData.order_date}
                                 onChange={e => setFormData({...formData, order_date: e.target.value})}
                                 variant="filled"
                                 className="pl-12"
                                 required
                              />
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest ml-1">Tahmini Teslimat</label>
                           <div className="relative">
                              <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                              <Input 
                                 type="date"
                                 value={formData.delivery_date}
                                 onChange={e => setFormData({...formData, delivery_date: e.target.value})}
                                 variant="filled"
                                 className="pl-12"
                              />
                           </div>
                        </div>
                     </CardBody>
                  </Card>

                  <div className="p-6 bg-white/[0.03] rounded-3xl border border-white/5 space-y-4">
                     <div className="flex items-center gap-3">
                        <Info className="w-5 h-5 text-warning" />
                        <h4 className="text-xs font-black uppercase tracking-widest">Önemli Not</h4>
                     </div>
                     <p className="text-[11px] text-foreground/40 leading-relaxed font-medium">
                        Sipariş kaydedildikten sonra otomatik olarak **"Beklemede"** durumuna alınır ve üretim planlama listesine düşer.
                     </p>
                  </div>
               </div>
            </div>
         </form>
      </div>
    </AppDashboardLayout>
  )
}
