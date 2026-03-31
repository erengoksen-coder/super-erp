'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Plus, Package, Search, Filter, Layers, 
  Settings, ChevronRight, Activity, TrendingUp,
  Box, Tag, CheckCircle2, MoreHorizontal,
  Info, ShoppingCart, Barcode, Grid, List
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { fetchApi, useApi } from '@/lib/api/client'
import { cn } from '@/lib/cn'

interface Product {
  id: string
  code: string
  name: string
  category: string | null
  base_cost: number
  base_price: number
  unit: string
  is_active: boolean
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  
  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    try {
      const { localDB } = await import('@/lib/database/client')
      const data = await localDB.getProducts()
      setProducts((data as any).map((p: any) => ({
        id: p.id,
        code: p.sku || 'SKU-NONE',
        name: p.name,
        category: p.category || 'GENEL',
        base_cost: 0,
        base_price: p.price || 0,
        unit: 'adet',
        is_active: true,
      })))
    } catch (err: any) {
      setError(err.message || 'Ürünler yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = useMemo(() => products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  ), [products, searchTerm])

  return (
    <AppDashboardLayout
      title="Ürün Kataloğu"
      subtitle="Nebim tarzı dinamik varyantlı ürün yönetimi"
      icon={ShoppingCart}
      actions={
        <div className="flex items-center gap-2">
           <Button variant="glass" size="sm" onClick={() => loadProducts()}>
              <Activity className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Güncelle
           </Button>
           <Link href="/products/new">
              <Button variant="solid" color="primary" size="sm">
                 <Plus className="w-4 h-4 mr-2" />
                 Yeni Ürün
              </Button>
           </Link>
        </div>
      }
    >
      <div className="space-y-6 animate-reveal">
         {/* Stats Overview */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Toplam Model</p>
                     <p className="text-3xl font-black">{products.length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                     <Layers className="w-6 h-6 shadow-glow" />
                  </div>
               </CardBody>
            </Card>
            <Card variant="glass" className="hover:scale-[1.02] transition-transform text-success">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Aktif Ürünler</p>
                     <p className="text-3xl font-black">{products.filter(p => p.is_active).length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-success/10">
                     <CheckCircle2 className="w-6 h-6 shadow-glow" />
                  </div>
               </CardBody>
            </Card>
            <Card variant="glass" className="hover:scale-[1.02] transition-transform text-secondary">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Yeni Sezon</p>
                     <p className="text-3xl font-black">{Math.floor(products.length * 0.3)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/10">
                     <TrendingUp className="w-6 h-6 shadow-glow" />
                  </div>
               </CardBody>
            </Card>
            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Varyant Sayısı</p>
                     <p className="text-3xl font-black">{products.length * 4}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5">
                     <Barcode className="w-6 h-6 opacity-40" />
                  </div>
               </CardBody>
            </Card>
         </div>

         {/* Filter Bar */}
         <Card variant="glass">
            <CardBody className="p-4 flex flex-col md:flex-row items-center gap-4">
               <div className="relative flex-1 group w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Model Adı veya Kod Ara..." 
                    className="pl-12 w-full" 
                    variant="filled"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>
               <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl">
                  <Button variant={viewMode === 'grid' ? 'solid' : 'ghost'} size="icon" onClick={() => setViewMode('grid')} className="h-10 w-10">
                     <Grid className="w-4 h-4" />
                  </Button>
                  <Button variant={viewMode === 'list' ? 'solid' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="h-10 w-10">
                     <List className="w-4 h-4" />
                  </Button>
               </div>
               <Button variant="glass" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Gelişmiş Filtre
               </Button>
            </CardBody>
         </Card>

         {/* Product Content */}
         <div className={cn(
            "animate-reveal",
            viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"
         )}>
            {loading ? (
               <div className="col-span-full py-20 text-center opacity-40 font-black uppercase tracking-widest text-lg">Veriler Hazırlanıyor...</div>
            ) : filteredProducts.length === 0 ? (
               <div className="col-span-full py-20 text-center opacity-20 font-black uppercase tracking-widest">Eşleşen ürün bulunamadı</div>
            ) : (
               filteredProducts.map((p) => (
                  viewMode === 'grid' ? (
                     <Card key={p.id} variant="glass" className="hover:scale-[1.02] transition-all group overflow-hidden border-white/5 hover:border-primary/50 cursor-pointer" onClick={() => router.push(`/products/${p.id}`)}>
                        <CardBody className="p-0">
                           <div className="aspect-square bg-white/5 relative overflow-hidden flex items-center justify-center">
                              <Box className="w-20 h-20 text-foreground/10 group-hover:scale-110 group-hover:text-primary transition-all duration-700" />
                              <div className="absolute top-4 right-4">
                                 <Badge variant="glass">{p.unit}</Badge>
                              </div>
                           </div>
                           <div className="p-6">
                              <div className="flex items-center gap-2 mb-1">
                                 <span className="text-[10px] font-black text-primary uppercase tracking-widest">{p.code}</span>
                                 <div className="w-1 h-1 rounded-full bg-foreground/20" />
                                 <span className="text-[10px] font-black text-foreground/40 uppercase tracking-widest">{p.category}</span>
                              </div>
                              <h4 className="font-black text-lg uppercase truncate leading-tight group-hover:text-primary transition-colors">{p.name}</h4>
                              <div className="mt-4 flex items-center justify-between">
                                 <p className="text-xl font-black text-foreground">₺{p.base_price.toLocaleString()}</p>
                                 <Button variant="ghost" size="icon" className="group-hover:bg-primary group-hover:text-white"><ChevronRight className="w-4 h-4" /></Button>
                              </div>
                           </div>
                        </CardBody>
                     </Card>
                  ) : (
                     <Card key={p.id} variant="glass" className="hover:bg-white/[0.02] transition-all group border-white/5 hover:border-primary/50 cursor-pointer" onClick={() => router.push(`/products/${p.id}`)}>
                        <CardBody className="p-4 flex items-center justify-between">
                           <div className="flex items-center gap-6">
                              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                 <Box className="w-6 h-6 text-foreground/20 group-hover:text-primary" />
                              </div>
                              <div className="min-w-0">
                                 <div className="flex items-center gap-3 mb-0.5">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">{p.code}</span>
                                    <Badge variant="glass" className="text-[8px] opacity-40">{p.category?.toUpperCase()}</Badge>
                                 </div>
                                 <h4 className="font-black text-lg uppercase tracking-tight truncate group-hover:text-primary transition-colors">{p.name}</h4>
                              </div>
                           </div>
                           <div className="flex items-center gap-12">
                              <div className="hidden md:flex flex-col items-end">
                                 <span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest leading-none mb-1">Birim Fiyat</span>
                                 <span className="text-lg font-black tracking-tighter">₺{p.base_price.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <Button variant="glass" size="icon" className="opacity-0 group-hover:opacity-100 transition-all hover:bg-white/5" onClick={(e) => { e.stopPropagation(); router.push(`/products/${p.id}/variants`); }}>
                                    <Barcode className="w-4 h-4" />
                                 </Button>
                                 <Button variant="glass" size="icon" className="group-hover:bg-primary group-hover:text-white transition-all">
                                    <ChevronRight className="w-5 h-5" />
                                 </Button>
                              </div>
                           </div>
                        </CardBody>
                     </Card>
                  )
               ))
            )}
         </div>
      </div>
    </AppDashboardLayout>
  )
}
