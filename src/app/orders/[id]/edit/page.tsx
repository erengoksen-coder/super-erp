'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Save, 
  ShoppingCart, 
  Calendar, 
  Package, 
  User, 
  Activity,
  AlertCircle,
  FileText
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { fetchApi, useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { formatDate } from '@/lib/utils/dateFormat'

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
  notes: string | null
}

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  const [loading, setLoading] = useState(false)
  const { data: order, isLoading, error } = useApi<OrderDetail>(id ? `/api/orders/${id}` : null)
  
  const [formData, setFormData] = useState<Partial<OrderDetail>>({})

  useEffect(() => {
    if (order) {
      setFormData({
        dealer_name: order.dealer_name,
        customer_name: order.customer_name,
        quantity: order.quantity,
        unit_price: order.unit_price,
        status: order.status,
        notes: order.notes,
        delivery_date: order.delivery_date
      })
    }
  }, [order])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    
    setLoading(true)
    try {
      await fetchApi('/api/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          id
        })
      })
      
      toast.success('Sipariş başarıyla güncellendi')
      router.push(`/orders/${id}`)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Güncelleme hatası')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }))
  }

  if (isLoading) return <div className="p-20 text-center opacity-20 font-black uppercase tracking-widest">Yükleniyor...</div>
  if (error || !order) return <div className="p-20 text-center text-red-500">Sipariş bulunamadı.</div>

  return (
    <AppDashboardLayout 
      title={`Siparişi Düzenle: ${order.order_number}`}
      subtitle={`${order.product_name} • ${order.quantity} Adet`}
      icon={ShoppingCart}
    >
      <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-reveal">
        <div className="flex items-center justify-between">
           <Link href={`/orders/${id}`} className="group flex items-center gap-2 text-foreground/40 hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest">
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              Detaylara Dön
           </Link>
           <Button variant="solid" color="primary" onClick={handleSubmit} disabled={loading} className="rounded-xl px-10 shadow-lg shadow-primary/20">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Güncellemeleri Kaydet
           </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-8 space-y-6">
              <Card variant="glass" className="border-white/5">
                 <CardBody className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] ml-1">Bayi / Dealer</label>
                          <Input name="dealer_name" value={formData.dealer_name || ''} onChange={handleChange} className="bg-white/5 border-white/10" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] ml-1">Müşteri İsmi</label>
                          <Input name="customer_name" value={formData.customer_name || ''} onChange={handleChange} className="bg-white/5 border-white/10" />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] ml-1">Miktar</label>
                          <Input type="number" name="quantity" value={formData.quantity || 0} onChange={handleChange} className="bg-white/5 border-white/10" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] ml-1">Birim Fiyat (₺)</label>
                          <Input type="number" name="unit_price" value={formData.unit_price || 0} onChange={handleChange} className="bg-white/5 border-white/10" />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] ml-1">Durum</label>
                       <select 
                         name="status"
                         value={formData.status}
                         onChange={handleChange}
                         className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                       >
                          <option value="pending">Bekliyor (Pending)</option>
                          <option value="in_production">Üretimde (In Production)</option>
                          <option value="completed">Tamamlandı (Completed)</option>
                          <option value="cancelled">İptal Edildi (Cancelled)</option>
                       </select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] ml-1">Özel Notlar</label>
                       <textarea 
                         name="notes"
                         value={formData.notes || ''}
                         onChange={handleChange}
                         rows={4}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                       />
                    </div>
                 </CardBody>
              </Card>
           </div>

           <div className="lg:col-span-4 space-y-6">
              <Card variant="glass" className="bg-primary/5 border-primary/20">
                 <CardBody className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                       <Activity className="w-4 h-4" />
                       <h4 className="text-xs font-black uppercase tracking-widest">Özet Bilgi</h4>
                    </div>
                    <div className="space-y-2 border-t border-white/5 pt-4">
                       <div className="flex justify-between text-[10px]">
                          <span className="text-foreground/40 font-bold uppercase tracking-tighter">Birim Fiyat:</span>
                          <span className="font-mono">₺{(formData.unit_price || 0).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-[10px]">
                          <span className="text-foreground/40 font-bold uppercase tracking-tighter">Miktar:</span>
                          <span className="font-mono">{formData.quantity || 0} Adet</span>
                       </div>
                       <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                          <span className="text-primary font-black uppercase tracking-widest text-[9px] mt-1">Toplam Tutar:</span>
                          <span className="font-black text-white">₺{((formData.quantity || 0) * (formData.unit_price || 0)).toLocaleString()}</span>
                       </div>
                    </div>
                 </CardBody>
              </Card>
              
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                       <AlertCircle className="w-4 h-4" />
                    </div>
                    <h5 className="text-[11px] font-black text-white uppercase tracking-widest">Dikkat</h5>
                 </div>
                 <p className="text-[10px] text-foreground/40 leading-relaxed font-medium">
                    Sipariş durumu 'Üretimde' veya sonrasına çekildiğinde, stok rezervasyonları ve hammadde planları otomatik olarak güncellenir. Değişiklik yaparken lütfen sevkiyat takvimini kontrol edin.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </AppDashboardLayout>
  )
}
