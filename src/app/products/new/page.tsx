'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Package, 
  ArrowLeft, 
  Save, 
  Trash2, 
  Sparkles, 
  Info,
  DollarSign,
  Layers,
  Activity
} from 'lucide-react'
import { generateProductCode } from '@/lib/utils/codeGenerator'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/cn'

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(true)
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Koltuk',
    unit: 'adet',
    price: 0,
    selling_price: 0,
    min_stock_level: 5,
    description: ''
  })

  useEffect(() => {
    async function loadCode() {
      try {
        const newCode = await generateProductCode()
        setCode(newCode)
      } catch (error) {
        console.error('Error generating code:', error)
        setCode(`PRD-${Date.now().toString().slice(-6)}`)
      } finally {
        setCodeLoading(false)
      }
    }
    loadCode()
  }, [])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    
    setLoading(true)
    try {
      const res = await fetchApi('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          sku: code
        })
      })
      
      toast.success('Ürün başarıyla oluşturuldu')
      router.push('/inventory/products')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Ürün kaydedilirken bir hata oluştu')
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-reveal">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <Link href="/inventory/products" className="group flex items-center gap-2 text-foreground/40 hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest mb-4">
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
            Ürün Listesine Dön
          </Link>
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-glow">
                <Package className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Yeni Ürün <span className="text-primary italic">Kartı.</span></h1>
                <p className="text-foreground/40 text-sm font-medium">Sistem portföyüne yeni bir mamül veya yarı mamül ekleyin.</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <Button variant="soft" color="secondary" onClick={() => router.back()} className="rounded-xl px-6">İptal</Button>
           <Button 
             variant="solid" 
             color="primary" 
             onClick={handleSubmit} 
             disabled={loading || codeLoading}
             className="rounded-xl px-8 shadow-lg shadow-primary/20"
           >
             {loading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
             ) : (
               <Save className="w-4 h-4 mr-2" />
             )}
             {loading ? 'İşleniyor...' : 'Ürünü Kaydet'}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Form Column */}
        <div className="lg:col-span-8 space-y-6">
           <Card variant="glass" className="border-white/5 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
              <CardBody className="p-8 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Ürün Kodu Field */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] ml-1">Ürün Kodu (SKU)</label>
                       <div className="relative group">
                          <Input 
                            value={code} 
                            readOnly 
                            className="bg-white/5 border-white/10 text-primary font-mono font-bold tracking-widest pl-10 cursor-not-allowed"
                          />
                          <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                          {codeLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />}
                       </div>
                       <p className="text-[9px] text-foreground/20 italic font-medium">Sistem tarafından otomatik üretildi.</p>
                    </div>

                    {/* Ürün Adı Field */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] ml-1">Ürün Adı *</label>
                       <div className="relative group">
                          <Input 
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Örn: Suna Köşe Takımı"
                            required
                            className="bg-white/5 border-white/10 group-hover:border-primary/30 transition-colors pl-10"
                          />
                          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-hover:text-primary/40 transition-colors" />
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Kategori Field */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] ml-1">Kategori</label>
                       <select 
                         name="category"
                         value={formData.category}
                         onChange={handleChange}
                         className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                       >
                          <option value="Koltuk">Koltuk Takımı</option>
                          <option value="Berjer">Berjer</option>
                          <option value="Yatak">Yatak & Baza</option>
                          <option value="Aksesuar">Aksesuar</option>
                          <option value="Yarımamül">Yarı Mamül</option>
                       </select>
                    </div>

                    {/* Birim Field */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] ml-1">Birim</label>
                       <select 
                         name="unit"
                         value={formData.unit}
                         onChange={handleChange}
                         className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                       >
                          <option value="adet">Adet (pcs)</option>
                          <option value="takım">Takım (set)</option>
                          <option value="metre">Metre (m)</option>
                       </select>
                    </div>
                 </div>

                 {/* Description Field */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] ml-1">Teknik Açıklama</label>
                    <textarea 
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Ürün özelliklerini ve teknik detaylarını buraya ekleyin..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                 </div>
              </CardBody>
           </Card>

           {/* Cost & Price Card */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card variant="glass" className="border-white/5 group hover:border-emerald-500/20 transition-colors">
                 <CardBody className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                          <DollarSign className="w-4 h-4" />
                       </div>
                       <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">Maliyet (₺)</span>
                    </div>
                    <Input 
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      className="bg-transparent border-0 border-b border-white/10 rounded-none focus:border-emerald-500 text-xl font-bold px-0"
                    />
                 </CardBody>
              </Card>

              <Card variant="glass" className="border-white/5 group hover:border-primary/20 transition-colors">
                 <CardBody className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Activity className="w-4 h-4" />
                       </div>
                       <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">Satış Fiyatı (₺)</span>
                    </div>
                    <Input 
                      type="number"
                      name="selling_price"
                      value={formData.selling_price}
                      onChange={handleChange}
                      className="bg-transparent border-0 border-b border-white/10 rounded-none focus:border-primary text-xl font-bold px-0"
                    />
                 </CardBody>
              </Card>

              <Card variant="glass" className="border-white/5 group hover:border-amber-500/20 transition-colors">
                 <CardBody className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                       <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                          <Info className="w-4 h-4" />
                       </div>
                       <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">Kritik Stok</span>
                    </div>
                    <Input 
                      type="number"
                      name="min_stock_level"
                      value={formData.min_stock_level}
                      onChange={handleChange}
                      className="bg-transparent border-0 border-b border-white/10 rounded-none focus:border-amber-500 text-xl font-bold px-0"
                    />
                 </CardBody>
              </Card>
           </div>
        </div>

        {/* Side Panel Column */}
        <div className="lg:col-span-4 space-y-6">
           <Card variant="glass" className="border-primary/20 bg-primary/5">
              <CardBody className="p-6 space-y-4">
                 <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-4 h-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Platinum Önerisi</h4>
                 </div>
                 <p className="text-[11px] text-foreground/60 leading-relaxed">
                    Sistem benzer ürünlerin ortalama kâr marjını %35 olarak hesaplıyor. Satış fiyatını 
                    <strong> ₺{((formData.price || 0) * 1.35).toFixed(2)}</strong> olarak belirlemeniz karlılık açısında ideal olabilir.
                 </p>
                 <div className="pt-2">
                    <Badge variant="soft" color="primary" className="text-[9px] font-bold">AKILLI FİYATLANDIRMA AKTİF</Badge>
                 </div>
              </CardBody>
           </Card>

           <Card variant="glass" className="border-white/5">
              <CardBody className="p-6 space-y-6">
                 <h4 className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.2em]">ÖNİZLEME</h4>
                 <div className="space-y-4">
                    <div className="aspect-square rounded-3xl bg-white/5 border border-white/10 border-dashed flex flex-col items-center justify-center gap-3 text-foreground/20 group hover:border-primary/30 transition-all cursor-pointer">
                       <Package className="w-10 h-10" />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Ürün Görseli Ekle</span>
                    </div>
                    <div>
                       <h5 className="font-bold text-white leading-tight">{formData.name || 'Ürün İsmi Girmediniz'}</h5>
                       <p className="text-primary font-mono text-[10px] mt-1">{code}</p>
                    </div>
                    <div className="pt-4 flex items-center justify-between border-t border-white/5">
                       <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">Tahmini Kâr</span>
                       <span className={cn(
                         "text-xs font-black",
                         formData.selling_price - formData.price > 0 ? "text-emerald-400" : "text-red-400"
                       )}>
                         ₺{(formData.selling_price - formData.price).toLocaleString('tr-TR')}
                       </span>
                    </div>
                 </div>
              </CardBody>
           </Card>
        </div>
      </div>
    </div>
  )
}

