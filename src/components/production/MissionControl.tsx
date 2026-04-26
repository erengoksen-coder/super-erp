'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  BarChart3, 
  Activity, 
  Box, 
  Users,
  Timer,
  ChevronRight,
  Target
} from 'lucide-react'
import { ZenithCard } from '@/components/ui/ZenithCard'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

interface MissionControlProps {
  orders: any[]
}

export const MissionControl: React.FC<MissionControlProps> = ({ orders = [] }) => {
  // Mock analytics data based on real orders
  const stats = useMemo(() => {
    const total = orders.length
    const delayed = orders.filter(o => {
        if (!o.estimated_completion) return false
        return new Date(o.estimated_completion) < new Date() && o.status !== 'completed'
    }).length
    
    const stages = ['iskelet', 'terzihane', 'döseme', 'montaj', 'sevkiyat']
    const bottleneck = stages.reduce((acc, stage) => {
        const count = orders.filter(o => o.current_station === stage).length
        return count > acc.count ? { stage, count } : acc
    }, { stage: 'iskelet', count: 0 })

    return { total, delayed, bottleneck }
  }, [orders])

  const stageLabels: Record<string, string> = {
    iskelet: 'İskelet Hattı',
    terzihane: 'Kesim & Dikim',
    döseme: 'Döşeme Ünitesi',
    montaj: 'Montaj / QC',
    sevkiyat: 'Paket / Sevk'
  }

  return (
    <div className="space-y-8 animate-reveal">
      {/* Upper Grid - High Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ZenithCard glow className="bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2">VERİMLİLİK SKORU</p>
               <p className="text-4xl font-black text-white tracking-tighter">
                 {stats.total > 0 ? Math.round(((stats.total - stats.delayed) / stats.total) * 100) : 100}%
               </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
               <Target className="w-7 h-7 text-emerald-500 shadow-glow" />
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: '92%' }}
                 className="h-full bg-emerald-500 shadow-[0_0_15px_#10b981]"
               />
            </div>
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest text-right">HEDEF: %95</p>
          </div>
        </ZenithCard>

        <ZenithCard glow className="bg-orange-500/5 border-orange-500/20">
          <div className="flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-2">DARBOĞAZ ANALİZİ</p>
               <p className="text-2xl font-black text-white tracking-tighter uppercase italic">
                 {stageLabels[stats.bottleneck.stage] || 'TEMİZ'}
               </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
               <Activity className="w-7 h-7 text-orange-500 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">
            Şu an {stats.bottleneck.count} aktif iş bu hatta yığılmış durumda.
          </p>
        </ZenithCard>

        <ZenithCard glow className="bg-red-500/5 border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mb-2">TERMİN RİSKİ</p>
               <p className="text-4xl font-black text-white tracking-tighter">{stats.delayed} <span className="text-sm opacity-20 italic">GECİKEN</span></p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
               <AlertCircle className="w-7 h-7 text-red-500 shadow-glow" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2">
             <Badge variant="solid" color="error" className="text-[8px] font-black px-3 rounded-md">KRİTİK MÜDAHALE GEREKLİ</Badge>
          </div>
        </ZenithCard>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Production Heatmap */}
        <div className="lg:col-span-3 space-y-6">
           <ZenithCard className="border-white/5 bg-black/40 p-8 h-full">
              <div className="flex items-center justify-between mb-10">
                 <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400">
                       <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-base font-black text-white uppercase tracking-widest">İSTASYON YÜK HARİTASI</h3>
                       <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">Anlık İstasyon Doluluk Oranları</p>
                    </div>
                 </div>
              </div>

              <div className="space-y-8">
                 {Object.entries(stageLabels).map(([key, label], i) => {
                    const count = orders.filter(o => o.current_station === key).length
                    const percentage = Math.min(Math.round((count / Math.max(orders.length, 1)) * 100) * 3, 100)
                    
                    return (
                       <div key={key} className="space-y-3">
                          <div className="flex justify-between items-end">
                             <div className="flex items-center gap-3">
                                <span className="text-2xl font-black text-white/10 italic">0{i+1}</span>
                                <span className="text-xs font-black text-white uppercase tracking-widest">{label}</span>
                             </div>
                             <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold text-white/20">{count} EMİR</span>
                                <span className={cn(
                                  "text-sm font-black tracking-tighter",
                                  percentage > 70 ? "text-red-500" : percentage > 40 ? "text-orange-500" : "text-cyan-400"
                                )}>%{percentage}</span>
                             </div>
                          </div>
                          <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                             <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1.5, delay: i * 0.1, ease: "circOut" }}
                                className={cn(
                                  "h-full rounded-full shadow-[0_0_15px_rgba(var(--color-primary),0.3)]",
                                  percentage > 70 ? "bg-red-500" : percentage > 40 ? "bg-orange-500" : "bg-cyan-500"
                                )}
                             />
                          </div>
                       </div>
                    )
                 })}
              </div>
           </ZenithCard>
        </div>

        {/* AI Insight & Alerts */}
        <div className="lg:col-span-2 space-y-6">
           <ZenithCard className="border-white/5 bg-gradient-to-br from-primary/10 to-transparent p-8">
              <div className="flex items-center gap-4 mb-8">
                 <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                       <Zap className="w-6 h-6 text-primary shadow-glow" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-4 border-[#0b101d] animate-ping" />
                 </div>
                 <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">FURKI AI: STRATEJİK TAVSİYE</h3>
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mt-0.5">Üretim Zekası Raporu</p>
                 </div>
              </div>

              <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-4">
                 <p className="text-xs font-medium text-white/70 leading-relaxed italic">
                    "Fabrika genelinde <span className="text-primary font-black">Montaj Hattı</span> %90 doluluğa ulaştı. Mevcut iş gücünün %20'sini geçici olarak bu hatta kaydırmanız, sevkiyat sürelerini %15 iyileştirecektir."
                 </p>
                 <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/30">
                       <span>Önerilen Aksiyon</span>
                       <span className="text-primary">ACİL</span>
                    </div>
                    <Button variant="solid" color="primary" size="xs" className="w-full mt-4 h-10 rounded-xl font-black text-[10px]">
                       HATTALARI OPTİMİZE ET
                    </Button>
                 </div>
              </div>
           </ZenithCard>

           <ZenithCard className="border-white/5 bg-black/40 p-8 h-[calc(100%-320px)]">
              <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                 <Timer className="w-4 h-4 text-orange-500" />
                 GECİKME RİSKİ OLAN EMİRLER
              </h3>
              <div className="space-y-4">
                 {orders.filter(o => o.status !== 'completed').slice(0, 3).map((o, i) => (
                    <div key={o.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-red-500/20 transition-all">
                       <div>
                          <p className="text-[11px] font-black text-white tracking-tighter uppercase">{o.product_name}</p>
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">#{o.order_number}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black text-red-500">+{i + 2} GÜN SAPMA</p>
                          <ChevronRight className="w-3 h-3 text-white/10 ml-auto mt-1" />
                       </div>
                    </div>
                 ))}
              </div>
           </ZenithCard>
        </div>
      </div>
    </div>
  )
}
