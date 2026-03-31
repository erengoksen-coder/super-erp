'use client'

import { useState, useEffect, useMemo } from 'react'
import { Package, Search, ShoppingCart, Filter, Eye, ChevronRight, Star, Tag, Info, Send } from 'lucide-react'
import { fetchApi as safeFetch } from '@/lib/api/client'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { toast } from '@/lib/notify'

export default function BayiCatalogPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await safeFetch<{ success: boolean; data: any[] }>('/api/bayi/catalog')
        if (res?.success) {
          setProducts(res.data || [])
        } else {
          toast.error('Katalog yüklenemedi')
        }
      } catch (e) {
        console.error(e)
        toast.error('Sistem hatası')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean))
    return ['all', ...Array.from(cats)]
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory
      return matchesSearch && matchesCat
    })
  }, [products, searchTerm, selectedCategory])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-medium">B2B Katalog Hazırlanıyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Search */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-700/50 rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
         {/* Decorative Gradients */}
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full -mr-32 -mt-32"></div>
         <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/5 blur-[120px] rounded-full -ml-32 -mb-32"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] rounded-full border border-blue-500/20">
                LivaSofa B2B
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                Telegram Entegre
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
              Ürün <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Kataloğu</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl font-medium leading-relaxed">
              En güncel modellerimiz, teknik detaylar ve size özel B2B fiyatlandırmaları ile tüm koleksiyonumuz.
            </p>
          </div>

          <div className="w-full lg:max-w-md space-y-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Model ismi veya SKU ara..."
                className="pl-12 h-14 bg-slate-950/50 border-slate-700 rounded-2xl focus:ring-blue-500/50 text-white font-medium"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    selectedCategory === cat 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-y-[-2px]' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'TÜMÜ' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredProducts.length === 0 ? (
        <EmptyState title="Ürün Bulunamadı" description="Arama kriterlerinize uygun ürün bulunmuyor." icon={Package} className="py-20 bg-slate-900/20 border border-slate-800 rounded-[2rem]" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <div 
              key={product.id}
              className="group bg-slate-900 border border-slate-700/50 rounded-[2rem] overflow-hidden hover:border-blue-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/20 flex flex-col"
            >
              {/* Image Container */}
              <div className="aspect-[4/3] relative overflow-hidden bg-slate-950">
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white/90 uppercase tracking-widest border border-white/10">
                    {product.category || 'MOBİLYA'}
                  </span>
                </div>
                {product.is_new && (
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-blue-600 rounded-lg text-[10px] font-black text-white uppercase tracking-widest shadow-lg">
                      YENİ SEZON
                    </span>
                  </div>
                )}
                {/* Hover Quick View Overlay */}
                <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                   <Link href={`/bayi/orders/new?productId=${product.id}`}>
                      <Button className="rounded-xl font-black text-xs gap-2 shadow-xl">
                        <ShoppingCart className="w-4 h-4" /> SEPETE EKLE
                      </Button>
                   </Link>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-slate-500 tracking-widest">{product.sku || 'SKU-001'}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />)}
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-white leading-tight group-hover:text-blue-400 transition-colors uppercase italic tracking-tight">
                    {product.name}
                  </h3>
                </div>

                <div className="mt-auto pt-6 border-t border-slate-800/60 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bayi Özel Fiyatı</p>
                    <div className="flex items-baseline gap-2">
                       <span className="text-2xl font-black text-blue-100 drop-shadow-md">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.dealer_price)}
                       </span>
                       {product.base_price > product.dealer_price && (
                         <span className="text-xs text-slate-500 line-through decoration-rose-500/50">
                           {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.base_price)}
                         </span>
                       )}
                    </div>
                  </div>
                  <Link href={`/bayi/orders/new?productId=${product.id}`}>
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 group-hover:bg-blue-600 group-hover:text-white text-slate-500 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                       <ChevronRight className="w-6 h-6" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Telegram Banner */}
      <div className="mt-12 bg-gradient-to-br from-slate-900 to-indigo-900/20 border border-slate-700/50 rounded-[2.5rem] p-10 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-10">
            <Send className="w-48 h-48 text-blue-400 transform rotate-[-15deg]" />
         </div>
         <div className="relative z-10 max-w-2xl">
            <h3 className="text-2xl font-black text-white mb-4 flex items-center gap-3 italic">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Send className="w-5 h-5" />
              </div>
              ANLIK SİPARİŞ TAKİBİ
            </h3>
            <p className="text-slate-300 font-medium leading-relaxed mb-6">
              Tüm siparişleriniz oluşturulduğu andan itibaren <b>Telegram üzerinden</b> merkeze anlık olarak iletilir. Üretim, paketleme ve kargolama aşamalarını anlık olarak telefonunuzdan takip edebilirsiniz.
            </p>
            <div className="flex items-center gap-4">
               <div className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
               <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">Merkez Sunucusu Bağlı & Senkronize</span>
            </div>
         </div>
      </div>
    </div>
  )
}
