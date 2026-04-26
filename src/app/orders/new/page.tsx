'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ShoppingCart,
  Calendar,
  Truck,
  User,
  Package,
  Info,
  Save,
  X,
  Hash,
  Layers,
  Palette,
  ChevronRight,
  GanttChartSquare,
  Sparkles,
  Zap,
  Globe
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { AutocompleteInput } from '@/components/ui/AutocompleteInput'
import { getAuthHeaders } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { cn } from '@/lib/cn'

interface OrderFormData {
  order_number: string;
  dealer_name: string;
  customer_name: string;
  customer_code: string;
  product_name: string;
  product_sku: string;
  quantity: number | string;
  unit_price: number;
  unit: string;
  order_date: string;
  delivery_date: string;
  fabric_code: string;
  case_info: string;
  leg_info: string;
  cushion_info: string;
  configuration: string;
  notes: string;
}

export default function NewOrderPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [formData, setFormData] = useState<OrderFormData>({
    order_number: `SIP-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
    dealer_name: '',
    customer_name: '',
    customer_code: '',
    product_name: '',
    product_sku: '',
    quantity: 1,
    unit_price: 0,
    unit: 'Adet',
    order_date: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
    delivery_date: '',
    fabric_code: '',
    case_info: '',
    leg_info: '',
    cushion_info: '',
    configuration: '',
    notes: ''
  })

  // Ürünleri fetch et
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true)
      try {
        const res = await fetch('/api/products', {
          headers: getAuthHeaders()
        })
        if (res.ok) {
          const data = await res.json()
          const mapped = (data.data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            code: p.sku,
            subtitle: p.selling_price ? `${p.selling_price} TL` : '',
            price: p.selling_price || 0,
            unit: p.unit || 'Adet'
          }))
          setProducts(mapped)
        }
      } catch (error) {
        console.error('Ürünler yüklenemedi:', error)
      } finally {
        setIsLoadingProducts(false)
      }
    }
    fetchProducts()
  }, [])

  // Carileri fetch et
  useEffect(() => {
    const fetchAccounts = async () => {
      setIsLoadingAccounts(true)
      try {
        const res = await fetch('/api/accounts?type=customer', {
          headers: getAuthHeaders()
        })
      if (res.ok) {
        const data = await res.json()
        const accountList = data.data?.data || data.data || []
        const mapped = accountList.map((a: any) => ({
          id: a.id,
          name: a.name,
          code: a.code,
          subtitle: a.code || 'Kodsuz Cari'
        }))
        setAccounts(mapped)
      }
      } catch (error) {
        console.error('Cariler yüklenemedi:', error)
      } finally {
        setIsLoadingAccounts(false)
      }
    }
    fetchAccounts()
  }, [])

  const handleProductSelect = (item: any) => {
    setFormData(prev => ({
      ...prev,
      product_name: item.name,
      product_sku: item.code || '',
      unit_price: item.price || prev.unit_price,
      unit: item.unit || prev.unit
    }))
  }

  const handleAccountSelect = (item: any) => {
    setFormData(prev => ({
      ...prev,
      dealer_name: item.name,
      customer_code: item.code || prev.customer_code
    }))
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)

    try {
      const submissionData = {
        ...formData,
        quantity: Number(formData.quantity) || 1,
        case_info: formData.case_info.trim() === '' ? 'KATALOK' : formData.case_info,
        leg_info: formData.leg_info.trim() === '' ? 'KATALOK' : formData.leg_info,
        cushion_info: formData.cushion_info.trim() === '' ? 'KATALOK' : formData.cushion_info,
        customer_name: formData.customer_name.trim() === '' ? 'SHOWROOM' : formData.customer_name,
        status: 'pending'
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthHeaders().Authorization.split(' ')[1]}`
        },
        body: JSON.stringify({
          orders: [submissionData]
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
      subtitle="Üretim ve sevkiyat süreci için detaylı sipariş kartı"
      icon={ShoppingCart}
      actions={
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="sm" onClick={() => router.push('/orders')} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all active:scale-95 border border-red-500/20">
              <X className="w-4 h-4 mr-2" /> İptal
           </Button>
           <Button variant="solid" size="sm" onClick={() => handleSubmit()} disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all font-black">
              <Save className="w-4 h-4 mr-2" /> {isSubmitting ? 'İşleniyor...' : 'Kaydet'}
           </Button>
        </div>
      }
    >
      <div className="relative max-w-5xl mx-auto animate-reveal pb-20">
         {/* Background Decorators */}
         <div className="absolute -top-24 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" />
         <div className="absolute -bottom-24 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />
         
         <form onSubmit={handleSubmit} className="space-y-8">
            <Card variant="glass" className="border-white/5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-visible">
               <CardHeader className="p-8 border-b border-white/5 bg-gradient-to-r from-gray-900/40 to-transparent">
                  <div className="flex justify-between items-center w-full">
                     <div className="flex items-center gap-5">
                        <div className="relative group">
                           <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-emerald-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-all" />
                           <div className="relative p-3.5 bg-gray-950 rounded-2xl border border-white/10">
                              <ShoppingCart className="w-6 h-6 text-primary shadow-glow" />
                           </div>
                        </div>
                        <div>
                           <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 tracking-tight uppercase leading-none mb-1.5">Sipariş Kayıt Formu</h2>
                           <div className="flex items-center gap-2">
                              <Sparkles className="w-3 h-3 text-emerald-400" />
                              <p className="text-[10px] text-emerald-500/70 font-black uppercase tracking-[0.2em]">AGI-OS PRO PRODUCTION ENGINE</p>
                           </div>
                        </div>
                     </div>
                     <div className="flex flex-col items-end gap-1">
                        <Badge variant="soft" color="primary" className="font-mono text-[10px] px-3 py-1 ring-1 ring-primary/20">
                           REL: 2026.Q2
                        </Badge>
                        <span className="text-[9px] font-black opacity-20 uppercase tracking-widest">LivaSofa System Integration</span>
                     </div>
                  </div>
               </CardHeader>
               
               <CardBody className="p-10 space-y-10">
                  {/* Satır 1: Sipariş Bilgileri */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                           <Hash className="w-3 h-3" /> Sipariş No
                        </label>
                        <Input 
                           value={formData.order_number}
                           variant="filled"
                           disabled
                           className="bg-gray-950/50 border-white/5 text-primary font-mono font-bold text-base h-12"
                        />
                     </div>
                     <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                           <Calendar className="w-3 h-3 text-primary" /> Tarih & Saat
                        </label>
                        <div className="relative group">
                           <Input 
                              type="datetime-local"
                              value={formData.order_date}
                              onChange={e => setFormData({...formData, order_date: e.target.value})}
                              variant="filled"
                              className="bg-gray-950/50 border-white/5 text-gray-200 h-12 focus:border-primary/50 transition-all font-medium"
                              required
                           />
                        </div>
                     </div>
                     <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                           <Truck className="w-3 h-3 text-emerald-500" /> Tahmini TeslimAT
                        </label>
                        <Input 
                           type="date"
                           value={formData.delivery_date}
                           onChange={e => setFormData({...formData, delivery_date: e.target.value})}
                           variant="filled"
                           className="bg-gray-950/50 border-white/5 text-gray-200 h-12 focus:border-emerald-500/50 transition-all font-medium"
                        />
                     </div>
                  </div>

                  {/* Gradient Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent w-full" />

                  {/* Satır 2: Cari ve Müşteri */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-4">
                        <label className="flex items-center gap-2 text-[11px] font-black text-primary/80 uppercase tracking-widest">
                           <Globe className="w-3 h-3" /> Bayi / Dealer (Cari Hesap) *
                        </label>
                        <AutocompleteInput 
                           placeholder="Cari arayın (Kod veya İsim)..." 
                           options={accounts}
                           isLoading={isLoadingAccounts}
                           value={formData.dealer_name}
                           onChange={val => setFormData({...formData, dealer_name: val})}
                           onSelect={handleAccountSelect}
                           className="bg-gray-950/40 border-white/5 text-gray-100 h-14 ring-1 ring-white/5 focus-within:ring-primary/40 transition-all"
                           required
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                           <label className="flex items-center gap-2 text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                              <User className="w-3 h-3" /> Müşteri / Son Kullanıcı
                           </label>
                           <Input 
                              placeholder="SHOWROOM..." 
                              value={formData.customer_name}
                              onChange={e => setFormData({...formData, customer_name: e.target.value})}
                              onBlur={e => {
                                if (e.target.value.trim() === '') {
                                  setFormData(prev => ({ ...prev, customer_name: 'SHOWROOM' }))
                                }
                              }}
                              variant="filled"
                              className="bg-gray-950/40 border-white/5 text-emerald-400 font-bold h-14 placeholder:text-gray-700 focus:border-emerald-500/40 transition-all"
                           />
                        </div>
                        <div className="space-y-4">
                           <label className="flex items-center gap-2 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                              Müşteri Kodu
                           </label>
                           <Input 
                              placeholder="KOD-BLANK" 
                              value={formData.customer_code}
                              onChange={e => setFormData({...formData, customer_code: e.target.value})}
                              variant="filled"
                              className="bg-gray-950/40 border-white/5 text-gray-400 font-mono h-14"
                           />
                        </div>
                     </div>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent w-full" />

                  {/* Satır 3: Ürün Bilgileri */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-4">
                        <label className="flex items-center gap-2 text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] animate-pulse">
                           <Package className="w-3 h-3" /> Ürün Adı / Modeli *
                        </label>
                        <AutocompleteInput 
                           placeholder="BOM listesinden seçim yapın..." 
                           options={products}
                           isLoading={isLoadingProducts}
                           onChange={(val) => setFormData({...formData, product_name: val})}
                           onSelect={handleProductSelect}
                           className="bg-gray-950/40 border-white/5 text-white h-14 ring-1 ring-blue-500/20 focus-within:ring-blue-500/60 transition-all"
                           required
                        />
                     </div>
                     <div className="space-y-4">
                        <label className="flex items-center gap-2 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                           SKU (Stok Kodu)
                        </label>
                        <Input 
                           placeholder="PRODUCT-CODE" 
                           value={formData.product_sku}
                           onChange={e => setFormData({...formData, product_sku: e.target.value})}
                           variant="filled"
                           className="bg-gray-950/40 border-white/5 text-primary/80 font-mono font-black h-14 tracking-wider"
                        />
                     </div>
                  </div>

                  {/* Satır 4: Miktar ve Fiyat */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="space-y-3">
                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Sipariş Miktarı *</label>
                        <Input 
                           type="number"
                           value={formData.quantity}
                           onChange={e => setFormData({...formData, quantity: e.target.value === '' ? '' : (parseInt(e.target.value))})}
                           onBlur={e => {
                             if (e.target.value === '' || parseInt(e.target.value) < 1) {
                               setFormData(prev => ({ ...prev, quantity: 1 }))
                             }
                           }}
                           variant="filled"
                           className="bg-primary/5 border-primary/20 text-primary font-black text-xl h-14 text-center ring-1 ring-primary/20 focus:ring-primary/60 transition-all"
                           required
                           min="1"
                        />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Birim Fiyat (TL)</label>
                        <div className="relative">
                           <Input 
                              type="number"
                              value={formData.unit_price}
                              onChange={e => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})}
                              variant="filled"
                              className="bg-gray-950/50 border-white/5 text-white font-bold h-14 pl-10"
                           />
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold">₺</span>
                        </div>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Ölçü Birimi</label>
                        <Input 
                           placeholder="ADET" 
                           value={formData.unit}
                           onChange={e => setFormData({...formData, unit: e.target.value})}
                           variant="filled"
                           className="bg-gray-950/50 border-white/5 text-gray-400 font-black h-14 text-center uppercase tracking-widest"
                        />
                     </div>
                  </div>

                  {/* ÜRETİM TEKNİK DETAYLARI SECTION */}
                  <div className="pt-6 space-y-8 bg-white/[0.02] -mx-10 px-10 py-10 border-y border-white/5">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg">
                           <GanttChartSquare className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                           <h3 className="text-sm font-black text-white uppercase tracking-widest">Üretim Teknik Detayları</h3>
                           <p className="text-[9px] text-gray-600 font-bold uppercase mt-0.5 tracking-tighter">İmalat departmanına aktarılacak özel veriler</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="flex items-center gap-2 text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                              <Palette className="w-3 h-3" /> Kumaş Kodu / Renk
                           </label>
                           <Input 
                              placeholder="Örn: NOBEL-01 / VİZON" 
                              value={formData.fabric_code}
                              onChange={e => setFormData({...formData, fabric_code: e.target.value})}
                              variant="filled"
                              className="bg-gray-950/40 border-indigo-500/20 text-white h-12 focus:border-indigo-500/60 transition-all font-bold"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="flex items-center gap-2 text-[11px] font-black text-gray-500 uppercase tracking-widest">
                              Konfigürasyon
                           </label>
                           <Input 
                              placeholder="L-MODÜL, 3'LÜ, 2'Lİ vb." 
                              value={formData.configuration}
                              onChange={e => setFormData({...formData, configuration: e.target.value})}
                              variant="filled"
                              className="bg-gray-950/40 border-white/5 text-gray-300 h-12 font-medium"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-[11px] font-black text-amber-500/80 uppercase tracking-widest">Kasa / İskelet</label>
                           <Input 
                              placeholder="KATALOK KASA" 
                              value={formData.case_info}
                              onChange={e => setFormData({...formData, case_info: e.target.value})}
                              onBlur={e => {
                                if (e.target.value.trim() === '') {
                                  setFormData(prev => ({ ...prev, case_info: 'KATALOK' }))
                                }
                              }}
                              variant="filled"
                              className="bg-gray-950/40 border-white/5 text-amber-500 font-bold h-12 placeholder:text-gray-800"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[11px] font-black text-amber-500/80 uppercase tracking-widest">Ayak / Aksesuar</label>
                           <Input 
                              placeholder="KATALOK AYAK" 
                              value={formData.leg_info}
                              onChange={e => setFormData({...formData, leg_info: e.target.value})}
                              onBlur={e => {
                                if (e.target.value.trim() === '') {
                                  setFormData(prev => ({ ...prev, leg_info: 'KATALOK' }))
                                }
                              }}
                              variant="filled"
                              className="bg-gray-950/40 border-white/5 text-amber-500 font-bold h-12 placeholder:text-gray-800"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-[11px] font-black text-amber-500/80 uppercase tracking-widest">Kırlent Detayı</label>
                           <Input 
                              placeholder="KATALOK KIRLENT" 
                              value={formData.cushion_info}
                              onChange={e => setFormData({...formData, cushion_info: e.target.value})}
                              onBlur={e => {
                                if (e.target.value.trim() === '') {
                                  setFormData(prev => ({ ...prev, cushion_info: 'KATALOK' }))
                                }
                              }}
                              variant="filled"
                              className="bg-gray-950/40 border-white/5 text-amber-500 font-bold h-12 placeholder:text-gray-800"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest font-black italic">Özel Üretim Notları</label>
                           <Input 
                              placeholder="Müşteri özel talepleri varsa buraya yazın..." 
                              value={formData.notes}
                              onChange={e => setFormData({...formData, notes: e.target.value})}
                              variant="filled"
                              className="bg-gray-950/40 border-white/5 text-gray-400 italic h-12 font-medium"
                           />
                        </div>
                     </div>
                  </div>
               </CardBody>

               {/* Footer / Kaydet Butonu */}
               <CardHeader className="p-10 border-t border-white/5 bg-gray-950/50 flex justify-between items-center">
                  <div className="hidden md:flex items-center gap-2 text-gray-600">
                     <Info className="w-4 h-4" />
                     <span className="text-[10px] font-bold uppercase tracking-tight">Kayıt sonrası sipariş fişi indirilebilir olacaktır.</span>
                  </div>
                  <div className="flex gap-6">
                     <Button 
                        variant="ghost" 
                        size="lg"
                        className="text-red-500/70 hover:text-red-400 hover:bg-red-500/5 transition-all w-32 font-bold tracking-widest border border-red-500/10" 
                        onClick={() => router.push('/orders')}
                     >
                        İPTAL
                     </Button>
                     <Button 
                        variant="solid" 
                        size="lg"
                        className="px-12 h-14 font-black uppercase tracking-[0.2em] text-[13px] relative group overflow-hidden bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 transition-all border border-emerald-400/20"
                        onClick={() => handleSubmit()}
                        disabled={isSubmitting}
                     >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-500 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 -z-10" />
                        <span className="flex items-center gap-3">
                           {isSubmitting ? (
                              <>
                                 <Zap className="w-4 h-4 animate-spin" /> İŞLENİYOR
                              </>
                           ) : (
                              <>
                                 <Save className="w-4 h-4" /> SİSTEME KAYDET
                              </>
                           )}
                        </span>
                     </Button>
                  </div>
               </CardHeader>
            </Card>
         </form>

         {/* Alt Bilgi / Trust Indicators */}
         <div className="mt-12 flex items-center justify-center gap-10 opacity-30">
            <div className="flex items-center gap-3">
               <div className="w-8 h-[1px] bg-gray-700" />
               <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Real-time Production Pipeline</span>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <CheckCircle className="w-4 h-4 text-emerald-500" />
               <span className="text-[10px] font-black uppercase tracking-widest">Cloud Sync Ready</span>
               <div className="w-8 h-[1px] bg-gray-700" />
            </div>
         </div>
      </div>
    </AppDashboardLayout>
  )
}

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
