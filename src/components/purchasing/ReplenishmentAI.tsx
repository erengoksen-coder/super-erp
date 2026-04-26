'use client'

import React, { useMemo } from 'react'
import { 
  BrainCircuit, 
  ShoppingCart, 
  AlertTriangle, 
  Clock, 
  TrendingDown,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { ZenithCard } from '@/components/ui/ZenithCard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

interface ReplenishmentAIProps {
  materials: any[]
}

export const ReplenishmentAI: React.FC<ReplenishmentAIProps> = ({ materials = [] }) => {
  const suggestions = useMemo(() => {
    return materials.filter(m => {
      const netStock = (m.stock_amount || 0) - (m.reserved_amount || 0)
      return netStock <= (m.min_stock_level || 0) || (m.required_amount || 0) > netStock
    }).map(m => {
      const netStock = (m.stock_amount || 0) - (m.reserved_amount || 0)
      const deficit = Math.max(0, (m.min_stock_level || 0) * 1.5 - netStock + (m.required_amount || 0))
      
      let priority: 'critical' | 'warning' | 'info' = 'info'
      if (netStock <= 0 || (m.required_amount || 0) > (m.stock_amount || 0)) priority = 'critical'
      else if (netStock <= (m.min_stock_level || 0)) priority = 'warning'

      return {
        ...m,
        deficit: Math.ceil(deficit),
        priority,
        daysRemaining: m.lead_time_days ? Math.floor(netStock / (Math.max(1, m.required_amount) / 30)) : null
      }
    }).sort((a, b) => {
      const pMap = { critical: 0, warning: 1, info: 2 }
      return pMap[a.priority] - pMap[b.priority]
    })
  }, [materials])

  if (suggestions.length === 0) return null

  return (
    <div className="space-y-6 animate-reveal">
      <div className="flex items-center justify-between mb-2">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
               <BrainCircuit className="w-5 h-5 text-primary" />
            </div>
            <div>
               <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  FURKI AI: AKILLI TEDARİK ÖNERİLERİ
                  <Badge variant="glass" className="text-[8px] bg-primary/10 text-primary border-primary/20">BETA</Badge>
               </h3>
               <p className="text-[10px] text-white/40 font-bold uppercase tracking-tight">Üretim planı ve stok seviyelerine göre otomatik ikmal listesi</p>
            </div>
         </div>
         <Button variant="ghost" size="sm" className="text-[10px] font-black text-primary hover:bg-primary/5 uppercase tracking-widest">
            TÜMÜNÜ SİPARİŞE DÖNÜŞTÜR <ArrowRight className="w-3 h-3 ml-2" />
         </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.slice(0, 6).map((item, i) => (
          <ZenithCard key={item.id} glow={item.priority === 'critical'} className={cn(
            "group relative overflow-hidden transition-all hover:scale-[1.02]",
            item.priority === 'critical' ? "bg-error/5 border-error/20" : "bg-white/[0.02] border-white/5"
          )}>
            <div className="flex items-start justify-between mb-4">
               <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                  <ShoppingCart className={cn("w-4 h-4", item.priority === 'critical' ? 'text-error' : 'text-white/40')} />
               </div>
               <Badge 
                 variant="soft" 
                 color={item.priority === 'critical' ? 'danger' : item.priority === 'warning' ? 'warning' : 'info'}
                 className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase"
               >
                 {item.priority === 'critical' ? 'KRİTİK' : item.priority === 'warning' ? 'DÜŞÜK STOK' : 'ÖNERİ'}
               </Badge>
            </div>

            <div className="mb-4">
               <h4 className="text-sm font-black text-white truncate uppercase tracking-tight group-hover:text-primary transition-colors">{item.name}</h4>
               <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{item.code}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 p-3 rounded-2xl bg-black/20 border border-white/5">
               <div>
                  <p className="text-[8px] font-black text-white/20 uppercase">MEVCUT</p>
                  <p className="text-sm font-black text-white">{item.stock_amount} <span className="text-[10px] text-white/40">{item.unit}</span></p>
               </div>
               <div className="text-right">
                  <p className="text-[8px] font-black text-error uppercase">İHTİYAÇ</p>
                  <p className="text-sm font-black text-error">+{item.deficit}</p>
               </div>
            </div>

            <div className="flex items-center justify-between">
               <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-white/20" />
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                     {item.lead_time_days || '?'} GÜN TEDARİK
                  </span>
               </div>
               <Button variant="solid" color={item.priority === 'critical' ? 'danger' : 'primary'} size="sm" className="h-8 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">
                  SATIN AL
               </Button>
            </div>

            {/* AI Insight Label */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
               <Sparkles className="w-3 h-3 text-primary" />
               <p className="text-[8px] font-bold text-white/40 leading-tight uppercase italic">
                  {item.priority === 'critical' ? 'ÜRETİM DURMA RİSKİ: HEMEN SİPARİŞ VERİN' : 'STOK MALİYETİ OPTİMİZASYONU İÇİN ÖNERİLİR'}
               </p>
            </div>
          </ZenithCard>
        ))}
      </div>
    </div>
  )
}
