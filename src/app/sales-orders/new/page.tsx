'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  Save, X, Plus, Trash2, ShoppingBag, 
  Search, Calculator, Calendar, ArrowLeft
} from 'lucide-react'
import { useApi } from '@/lib/api/client'
import { fetchApi } from '@/lib/api/fetch'
import { toast } from '@/lib/notify'
import { useAuthStore } from '@/lib/store/authStore'
import { orderSchema, OrderInput } from '@/lib/validation/scm-schema'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/ui/PageLoader'

export default function NewSalesOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // API Data - safely extract arrays
  const { data: rawAccounts, isLoading: loadingAccounts } = useApi<any>('/api/accounts?type=customer')
  const { data: rawProducts, isLoading: loadingProducts } = useApi<any>('/api/inventory/materials')
  
  const accounts = Array.isArray(rawAccounts) ? rawAccounts : (rawAccounts?.data ?? rawAccounts?.list ?? [])
  const products = Array.isArray(rawProducts) ? rawProducts : (rawProducts?.data ?? rawProducts?.list ?? [])


  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      account_id: '',
      order_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      payment_terms_days: 0,
      items: [{ product_id: '', quantity: 1, unit_price: 0 }]
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const watchedItems = watch('items')
  
  // Hesaplamalar
  const totals = useMemo(() => {
    const subtotal = watchedItems.reduce((sum, item) => {
      return sum + (Number(item.quantity) * Number(item.unit_price) || 0)
    }, 0)
    return { subtotal, total: subtotal }
  }, [watchedItems])

  const onSubmit = async (data: OrderInput) => {
    setLoading(true)
    try {
      await fetchApi('/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      toast.success('Satış siparişi başarıyla oluşturuldu')
      router.push('/sales-orders')
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loadingAccounts || loadingProducts) return <PageLoader label="Form yüklenebilir hale getiriliyor..." />

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/sales-orders" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3 h-3" /> Siparişlere Dön
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight text-glow-emerald">Yeni Satış Siparişi</h1>
          </div>
          <p className="text-gray-400 mt-1 italic">Müşteri siparişini detaylandırın ve kaydedin</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()} className="border-white/10 text-gray-400 hover:text-white">
            <X className="w-4 h-4 mr-2" /> Vazgeç
          </Button>
          <Button 
            onClick={handleSubmit(onSubmit)} 
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 px-8"
          >
            <Save className="w-4 h-4 mr-2" /> {loading ? 'Kaydediliyor...' : 'Siparişi Kaydet'}
          </Button>
        </div>
      </div>

      <form className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol Panel: Sipariş Detayları */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 bg-white/[0.02] border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-6 border-l-4 border-emerald-500 pl-4">
              <Plus className="w-4 h-4 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Sipariş Kalemleri</h2>
            </div>
            
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-4 items-end p-4 bg-white/[0.01] border border-white/5 rounded-xl group hover:border-emerald-500/30 transition-all">
                  <div className="col-span-12 md:col-span-5">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Ürün / Malzeme</label>
                    <select
                      {...register(`items.${index}.product_id`)}
                      className="w-full bg-gray-950/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:ring-1 focus:ring-emerald-500"
                      onChange={(e) => {
                        const product = products.find((p: any) => p.id === e.target.value)
                        if (product) setValue(`items.${index}.unit_price`, (product as any).unit_price || 0)
                      }}
                    >
                      <option value="">Seçiniz...</option>
                      {products.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-span-6 md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Miktar</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      className="w-full bg-gray-950/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  
                  <div className="col-span-6 md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Birim Fiyat (₺)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                      className="w-full bg-gray-950/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  
                  <div className="col-span-12 md:col-span-2 flex justify-end">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => remove(index)}
                      className="text-rose-400 hover:text-white hover:bg-rose-500/10 h-10 w-10 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => append({ product_id: '', quantity: 1, unit_price: 0 })}
                className="w-full border-dashed border-white/10 hover:border-emerald-500/50 text-gray-400 hover:text-emerald-400 py-6"
              >
                <Plus className="w-4 h-4 mr-2" /> Yeni Satır Ekle
              </Button>
            </div>
          </Card>
        </div>

        {/* Sağ Panel: Genel Bilgiler & Özet */}
        <div className="space-y-6">
          <Card className="p-6 bg-white/[0.02] border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-6 border-l-4 border-blue-500 pl-4">
              <Calendar className="w-4 h-4 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Genel Bilgiler</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Müşteri / Cari Hesap</label>
                <select
                  {...register('account_id')}
                  className="w-full bg-gray-950/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Seçiniz...</option>
                  {accounts.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                  ))}
                </select>
                {errors.account_id && <p className="mt-1 text-xs text-rose-400">{errors.account_id.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Sipariş Tarihi</label>
                <input
                  type="date"
                  {...register('order_date')}
                  className="w-full bg-gray-950/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Vade (Gün)</label>
                <input
                  type="number"
                  {...register('payment_terms_days', { valueAsNumber: true })}
                  className="w-full bg-gray-950/50 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-emerald-500/5 border-emerald-500/20 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Sipariş Özeti</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Ara Toplam</span>
                <span>{totals.subtotal.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400 border-b border-white/5 pb-2">
                <span>KDV (Dahil/Sıfır)</span>
                <span>0,00 ₺</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-white pt-2">
                <span>NET TOPLAM</span>
                <span className="text-emerald-400">{totals.total.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  )
}
