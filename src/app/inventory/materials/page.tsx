'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Plus, Package, AlertTriangle, ArrowDown, ArrowUp, 
  Filter, Edit, Trash2, RefreshCw, 
  Search, CheckCircle2,
  Layers, Activity, TrendingUp, ChevronRight,
  X, Boxes, ShoppingCart, 
  ClipboardList, Navigation, Upload, 
  Zap, Info, ExternalLink,
  Scissors, Hammer, Disc, Cloud, ListChecks,
  Clock, Truck, BarChart3, MapPin
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { fetchApi, useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/cn'

interface Material {
  id: string
  code: string
  name: string
  unit: string
  stock_amount: number
  total_in: number
  total_out: number
  reserved_amount: number
  required_amount: number
  min_stock_level: number
  max_stock_level?: number
  category: string | null
  unit_price: number
  location?: string
  lead_time_days?: number
  supplier_name?: string | null
  last_purchase_date?: string | null
}

const STATIC_CATEGORIES = [
  { id: 'Tümü', label: 'TÜMÜ', icon: ListChecks },
  { id: 'Kumaş', label: 'KUMAŞ', icon: Scissors, color: 'bg-[#FF8000]' },
  { id: 'Ahşap', label: 'AHŞAP', icon: Disc, color: 'bg-[#2563EB]' },
  { id: 'Hırdavat', label: 'HIRDAVAT', icon: Hammer, color: 'bg-[#10B981]' },
  { id: 'Sünger', label: 'SÜNGER', icon: Cloud, color: 'bg-[#0EA5E9]' },
  { id: 'Diğer', label: 'DİĞER', icon: Package, color: 'bg-[#475569]' }
]

export default function MaterialsInventoryPage() {
  const router = useRouter()
  const { data: materials = [], isLoading, mutate } = useApi<Material[]>('/api/materials')
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü')
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

  const filteredMaterials = useMemo(() => materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.code.toLowerCase().includes(searchTerm.toLowerCase())
    const materialCat = m.category || 'Diğer'
    const matchesCategory = selectedCategory === 'Tümü' || materialCat.toLowerCase() === selectedCategory.toLowerCase()
    return matchesSearch && matchesCategory
  }), [materials, searchTerm, selectedCategory])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Tümü: materials.length }
    materials.forEach(m => {
      const cat = m.category || 'Diğer'
      const normalizedCat = STATIC_CATEGORIES.find(c => c.id.toLowerCase() === cat.toLowerCase())?.id || 'Diğer'
      counts[normalizedCat] = (counts[normalizedCat] || 0) + 1
    })
    return counts
  }, [materials])

  const handleRecalculate = async () => {
    setIsRecalculating(true)
    try {
      await fetchApi('/api/materials/recalculate-stock', { method: 'POST' })
      toast.success('Hammadde verileri senkronize edildi.')
      mutate()
    } catch (e: any) { toast.error(e.message) }
    finally { setIsRecalculating(false) }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await fetchApi(`/api/materials/${deleteConfirm.id}`, { method: 'DELETE' })
      toast.success('Hammadde kartı imha edildi.')
      setDeleteConfirm(null)
      mutate()
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <AppDashboardLayout
      title="Hammadde Deposu"
      subtitle="Ultimate Platinum Horizon - V8.0 Extreme Detail"
      icon={Zap}
      className={cn(
        "min-h-screen relative overflow-hidden",
        "bg-[#020508] text-white selection:bg-cyan-500/20",
        // HOLOGRAPHIC BLUEPRINT GRID
        "before:fixed before:inset-0 before:pointer-events-none before:bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.1)_0%,transparent_70%)]",
        "after:fixed after:inset-0 after:pointer-events-none after:bg-[linear-gradient(rgba(6,182,212,0.03)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(6,182,212,0.03)_1.5px,transparent_1.5px)] after:bg-[size:80px_80px] after:opacity-20"
      )}
      actions={
        <div className="flex items-center gap-2 relative z-50">
           <Button variant="glass" size="xs" onClick={handleRecalculate} disabled={isRecalculating} className="border-white/5 rounded-lg text-[10px] tracking-widest font-black uppercase">
              <RefreshCw className={cn("w-3.5 h-3.5 mr-2", isRecalculating && "animate-spin")} />
              SENKRON
           </Button>
           <Link href="/inventory/materials/new">
              <Button variant="solid" color="primary" size="xs" className="shadow-[0_0_20px_rgba(var(--color-primary),0.3)] rounded-lg text-[10px] font-black border-none">
                 <Plus className="w-3.5 h-3.5 mr-2" />
                 YENİ KAYIT
              </Button>
           </Link>
        </div>
      }
    >
      <div className="space-y-6 relative z-40 max-w-[1780px] mx-auto pb-48">
         
         {/* SEARCH HUB */}
         <div className="flex flex-col md:flex-row gap-4 bg-white/[0.02] p-3 rounded-[28px] border border-white/5 backdrop-blur-3xl shadow-2xl">
            <div className="flex-1 relative group">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/5 group-focus-within:text-cyan-400 transition-colors" />
               <Input 
                 placeholder="Hammadde ara..." 
                 className="pl-14 w-full h-12 bg-black/50 border-white/5 text-sm font-bold rounded-[18px] focus:border-cyan-500/30 transition-all opacity-80" 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-[18px] border border-white/5 overflow-x-auto no-scrollbar">
               {STATIC_CATEGORIES.map((cat) => (
                  <button 
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "px-6 py-2.5 rounded-[14px] flex items-center gap-3 transition-all duration-700 font-black",
                      selectedCategory === cat.id ? "bg-white/10 text-cyan-400 shadow-xl" : "text-white/40 hover:text-white"
                    )}
                  >
                     <span className="text-[10px] uppercase tracking-widest">{cat.label}</span>
                     <span className="text-[10px] opacity-40 bg-white/5 px-2 py-0.5 rounded-full">{categoryCounts[cat.id] || 0}</span>
                  </button>
               ))}
            </div>
         </div>

         {/* EXTREME DETAIL MATRIX GRID (The Absolute V8.0 Standard) */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-reveal">
            {isLoading ? (
               <div className="col-span-full py-60 flex flex-col items-center gap-5">
                  <div className="w-10 h-10 border-4 border-white/5 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_40px_rgba(6,182,212,0.3)]" />
                  <span className="text-[9px] font-black tracking-[2em] text-white/5 uppercase">FIDELITY_SYNC</span>
               </div>
            ) : filteredMaterials.map((material) => {
               const available = material.stock_amount - material.reserved_amount
               const isShortage = material.required_amount > 0 && available < material.required_amount
               
               const categoryObj = STATIC_CATEGORIES.find(c => c.id.toLowerCase() === (material.category || 'Diğer').toLowerCase())
               const categoryColor = categoryObj?.color || 'bg-slate-600'
               
               return (
                  <div key={material.id} className={cn(
                    "relative overflow-hidden group transition-all duration-700 rounded-[32px]",
                    "bg-[#0b101d]/95 backdrop-blur-[100px] border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]",
                    // MULTI-LAYER RIM LIGHT
                    "before:absolute before:inset-0 before:p-[1px] before:rounded-[32px] before:bg-gradient-to-br before:from-white/40 before:via-white/5 before:to-transparent before:-z-10 before:pointer-events-none before:shadow-[inset_0_1px_4px_rgba(255,255,255,0.15)]",
                    isShortage && "ring-1 ring-rose-500/30"
                  )}>
                     {/* CINEMATIC GLASS OVERLAY */}
                     <div className="absolute inset-x-[-100%] top-[-50%] h-[200%] w-[200%] bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.08)_0%,transparent_55%)] pointer-events-none z-10 -rotate-12 translate-y-[-20%] group-hover:translate-y-[-5%] transition-transform duration-1000" />
                     
                     <div className="flex flex-col relative z-20">
                        
                        {/* Header Branding (Match Reference) */}
                        <div className="p-5 space-y-4">
                           <div className="flex items-start justify-between">
                              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic drop-shadow-2xl selection:bg-cyan-500">
                                 {material.name}
                              </h2>
                              <div className="flex items-center gap-2 bg-[#10B981]/15 text-[#10B981] px-3 py-1.5 rounded-full border border-[#10B981]/20 backdrop-blur-3xl">
                                 <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_10px_#10B981]" />
                                 <span className="text-[10px] font-black uppercase leading-none">2sa önce</span>
                              </div>
                           </div>

                           {/* Icon Pill Row (Exact Styling) */}
                           <div className="flex flex-wrap items-center gap-3">
                              <div className={cn(
                                "px-6 py-2 rounded-full text-white font-black text-[10px] tracking-widest uppercase shadow-[0_10px_30px_-5px_rgba(0,0,0,0.9)] ring-1 ring-white/10",
                                categoryColor,
                                categoryObj?.id === 'Kumaş' && "shadow-[0_0_20px_rgba(255,128,0,0.4)]"
                              )}>
                                 {categoryObj?.label || 'DİĞER'}
                              </div>
                              <div className="px-5 py-2 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/20 text-[#60A5FA] font-black text-[10px] tracking-widest uppercase backdrop-blur-3xl shadow-lg">
                                 Tedarik: {material.lead_time_days || 0} Gün
                              </div>
                              <div className="px-5 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-black text-[10px] tracking-widest uppercase backdrop-blur-3xl shadow-lg">
                                 Konum: A-21
                              </div>
                           </div>
                        </div>

                        {/* Mid Section: THE MICRO-GRID (Exact Table from Reference) */}
                        <div className="flex flex-row items-stretch">
                           
                           {/* Left Table Data */}
                           <div className="flex-1 border-t border-white/[0.05] divide-y divide-white/[0.05]">
                              {[
                                 { label: 'Fiziksel Stok', val: material.stock_amount },
                                 { label: 'Ayrılan', val: material.reserved_amount },
                                 { label: 'Kullanılabilir', val: available, highlight: true },
                                 { label: 'Üretim İhtiyacı', val: material.required_amount }
                              ].map((row, idx) => (
                                 <div key={idx} className="flex items-center justify-between px-5 h-11 transition-colors hover:bg-white/[0.03]">
                                    <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest">{row.label}</span>
                                    <span className={cn(
                                       "text-[16px] font-black tabular-nums tracking-tighter leading-none shadow-sm",
                                       row.highlight ? (available <= 0 ? "text-rose-500" : "text-white") : "text-white/80"
                                    )}>
                                       {row.val.toLocaleString()}
                                    </span>
                                 </div>
                              ))}
                           </div>

                           {/* Right Detail Case (The Inset Panel) */}
                           <div className="w-[120px] bg-black/50 border-t border-l border-white/[0.05] p-5 flex flex-col justify-between relative overflow-hidden">
                              {/* Inset Shadow Masking */}
                              <div className="absolute inset-0 shadow-[inset_0_4px_40px_rgba(0,0,0,0.6)] pointer-events-none" />
                              
                              <div className="space-y-1 relative z-10">
                                 <span className="text-[8px] font-black text-white/10 uppercase tracking-[0.4em] leading-none mb-2 block">ANA TEDARİKÇİ</span>
                                 <p className="text-[12px] font-black text-white uppercase tracking-tight leading-tight line-clamp-2">
                                    {material.supplier_name || 'Liva Tekstil'}
                                 </p>
                              </div>

                              <div className="mt-4 relative z-10 space-y-3">
                                 <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-white/10 italic">Price</span>
                                    <TrendingUp className="w-5 h-5 text-[#10B981] drop-shadow-[0_0_10px_#10B981]" />
                                 </div>
                                 <p className="text-2xl font-black text-white tracking-tighter leading-none shadow-2xl">
                                    {material.unit_price?.toLocaleString() || '29,00'}
                                 </p>
                                 
                                 <Button 
                                    variant="glass" 
                                    className="w-full h-8 rounded-lg bg-white/[0.04] border border-white/5 font-black text-[8px] tracking-[0.2em] uppercase hover:bg-white/10 transition-all font-mono"
                                    onClick={() => router.push(`/inventory/materials/${material.id}`)}
                                 >
                                    DETAY PANEL
                                 </Button>
                              </div>

                              {isShortage && (
                                 <div className="absolute top-0 right-0 p-3">
                                    <AlertTriangle className="w-3 h-3 text-rose-500 shadow-[0_0_15px_#f43f5e]" />
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
               )
            })}
         </div>

         {/* Final Fidelity Footer */}
         <div className="flex justify-between items-center opacity-5 font-mono text-[10px] tracking-[2em] uppercase pt-10 border-t border-white/5">
            <span>EXTREMECORE v8.0</span>
            <span>ABSOLUTE_FIDELITY</span>
         </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Güvenli Silme Operasyonu"
        message="Hammadde veritabanı kümesini sistemden kalıcı olarak imha etmek istediğinizden emin misiniz?"
        variant="danger"
      />
    </AppDashboardLayout>
  )
}
