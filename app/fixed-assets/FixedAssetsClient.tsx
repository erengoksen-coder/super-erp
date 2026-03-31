'use client'

import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Settings, 
  Activity, 
  Server, 
  Box, 
  History, 
  ChevronRight,
  TrendingUp,
  MapPin,
  Calendar,
  Wrench,
  Calculator,
  Briefcase,
  Monitor,
  Camera,
  Car,
  Home,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { fetchApi } from '@/lib/api/client'
import { formatDate } from '@/lib/utils/dateFormat'
import { cn } from '@/lib/cn'

type FixedAsset = {
  id: string
  name: string
  code: string
  category: string
  acquisition_date: string
  acquisition_cost: number
  useful_life_years: number
  depreciation_method: string
  location?: string | null
  status: string
}

export default function FixedAssetsClient() {
  const [assets, setAssets] = useState<FixedAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  async function loadAssets() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApi<FixedAsset[]>('/api/fixed-assets')
      setAssets(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Varlıklar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAssets() }, [])

  const filteredAssets = assets.filter((asset) => {
    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      !search ||
      asset.name.toLowerCase().includes(search) ||
      asset.code.toLowerCase().includes(search) ||
      asset.category.toLowerCase().includes(search)
    return matchesCategory && matchesSearch
  })

  const categories = Array.from(new Set(assets.map((a) => a.category)))

  return (
    <div className="space-y-8 animate-reveal">
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-4 text-error">
           <AlertCircle className="w-5 h-5 shadow-glow shadow-error/40" />
           <p className="text-[11px] font-black uppercase tracking-widest leading-none leading-relaxed italic">{error}</p>
        </div>
      )}

      {/* Main Assets Table */}
      <Card variant="glass" className="border-white/5 overflow-hidden">
        <CardHeader className="p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-2xl text-primary border border-primary/20">
                 <Briefcase className="w-8 h-8 shadow-glow shadow-primary/40" />
              </div>
              <div>
                 <h2 className="text-xl font-black uppercase tracking-tight">Varlık & Demirbaş Kartları</h2>
                 <p className="text-[10px] font-bold text-foreground/30 uppercase mt-1 tracking-widest italic leading-relaxed">ŞİRKET ENVANTERİ VE LOKASYON TAKİBİ</p>
              </div>
           </div>
           
           <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:min-w-64">
                 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-all duration-300 pointer-events-none" />
                 <Input 
                    variant="filled" 
                    placeholder="Ara (Ad / Kod / Kategori)..." 
                    className="pl-10 h-11 text-xs font-bold" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
              <select
                className="h-11 px-4 bg-white/5 border border-white/5 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">FİLİTRE: TÜMÜ</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                ))}
              </select>
              <Button variant="ghost" size="icon" onClick={loadAssets} className="h-11 w-11 rounded-2xl"><RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /></Button>
           </div>
        </CardHeader>
        <CardBody className="p-0">
           <div className="overflow-x-auto">
              <table className="w-full">
                 <thead>
                    <tr className="bg-white/5 border-b border-white/5 text-[9px] font-black text-foreground/40 uppercase tracking-widest">
                       <th className="p-6 text-left">Kod</th>
                       <th className="p-6 text-left">Varlık Tanımı</th>
                       <th className="p-6 text-left">Kategori</th>
                       <th className="p-6 text-left">Edinim / Amortisman</th>
                       <th className="p-6 text-right">Maliyet</th>
                       <th className="p-6 text-center">Durum</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {loading ? (
                       <tr><td colSpan={6} className="py-24 text-center opacity-40 font-black uppercase tracking-widest text-xs animate-pulse">Varlıklar Taranıyor...</td></tr>
                    ) : filteredAssets.length === 0 ? (
                       <tr><td colSpan={6} className="py-24 text-center opacity-20 font-black uppercase tracking-widest text-xs">Varlık bulunamadı.</td></tr>
                    ) : (
                       filteredAssets.map((asset) => (
                          <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors group">
                             <td className="p-6">
                                <span className="text-xs font-mono font-black text-foreground/30 group-hover:text-primary transition-colors">{asset.code}</span>
                             </td>
                             <td className="p-6">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-primary group-hover:scale-110 transition-transform">
                                      {asset.name.substring(0, 1).toUpperCase()}
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="text-sm font-black uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">{asset.name}</span>
                                      <span className="text-[10px] font-bold opacity-30 uppercase tracking-tight italic flex items-center gap-1">
                                         <MapPin className="w-3 h-3" /> {asset.location || 'BİLİNMİYOR'}
                                      </span>
                                   </div>
                                </div>
                             </td>
                             <td className="p-6">
                                <Badge variant="glass" className="text-[8px] font-black bg-white/5 border-white/5 uppercase tracking-widest">{asset.category}</Badge>
                             </td>
                             <td className="p-6">
                                <div className="flex flex-col gap-1">
                                   <span className="text-xs font-bold text-foreground/60 flex items-center gap-1.5 uppercase tracking-tighter"><Calendar className="w-3.5 h-3.5 opacity-40" /> {formatDate(asset.acquisition_date)}</span>
                                   <span className="text-[9px] font-black opacity-20 uppercase tracking-widest">{asset.useful_life_years} Yıl Faydalı Ömür</span>
                                </div>
                             </td>
                             <td className="p-6 text-right">
                                <span className="text-sm font-black text-primary tracking-tighter shadow-glow-sm">₺{asset.acquisition_cost.toLocaleString('tr-TR')}</span>
                             </td>
                             <td className="p-6 text-center">
                                <Badge 
                                   variant="soft" 
                                   color={asset.status === 'active' ? 'success' : asset.status === 'retired' ? 'secondary' : 'warning'} 
                                   className="text-[8px] font-black px-4 tracking-widest shadow-glow-sm shadow-white/5"
                                >
                                   {asset.status.toUpperCase()}
                                </Badge>
                             </td>
                          </tr>
                       ))
                    )}
                 </tbody>
              </table>
           </div>
        </CardBody>
      </Card>

      {/* Grid: Future Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <Card variant="glass" className="bg-primary/5 border-primary/20 group">
            <CardBody className="p-8 space-y-6">
               <div className="flex items-center gap-3 text-primary">
                  <Calculator className="w-6 h-6 shadow-glow shadow-primary/30 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Amortisman Planları</h3>
               </div>
               <p className="text-[11px] font-medium text-foreground/40 leading-relaxed italic uppercase tracking-[0.1em]">Yıllık amortisman hesaplamaları ve muhasebe fişleri için veri entegrasyonu devam ediyor.</p>
               <div className="pt-4 border-t border-primary/10 flex justify-end">
                  <Badge variant="glass" className="text-[7px] font-black bg-white/5 uppercase">HESAPLANIYOR</Badge>
               </div>
            </CardBody>
         </Card>

         <Card variant="glass" className="bg-secondary/5 border-secondary/20 group">
            <CardBody className="p-8 space-y-6">
               <div className="flex items-center gap-3 text-secondary">
                  <Wrench className="w-6 h-6 shadow-glow shadow-secondary/30 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Bakım & Servis</h3>
               </div>
               <p className="text-[11px] font-medium text-foreground/40 leading-relaxed italic uppercase tracking-[0.1em]">Makine ve teçhizat periyodik bakım kayıtları modülleri yakında eklenecek.</p>
               <div className="pt-4 border-t border-secondary/10 flex justify-end">
                  <Badge variant="glass" className="text-[7px] font-black bg-white/5 uppercase">PLANLANDI</Badge>
               </div>
            </CardBody>
         </Card>

         <Card variant="glass" className="bg-warning/5 border-warning/20 group">
            <CardBody className="p-8 space-y-6">
               <div className="flex items-center gap-3 text-warning">
                  <TrendingUp className="w-6 h-6 shadow-glow shadow-warning/30 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Değerleme Raporları</h3>
               </div>
               <p className="text-[11px] font-medium text-foreground/40 leading-relaxed italic uppercase tracking-[0.1em]">Varlık değerleme ve analiz raporları için analitik araçlar hazırlanıyor.</p>
               <div className="pt-4 border-t border-warning/10 flex justify-end">
                  <Badge variant="glass" className="text-[7px] font-black bg-white/5 uppercase">HAZIRLANIYOR</Badge>
               </div>
            </CardBody>
         </Card>
      </div>
    </div>
  )
}
