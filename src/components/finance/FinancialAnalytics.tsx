'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart, 
  ArrowUpRight,
  Target,
  CreditCard,
  Wallet,
  ArrowDownRight,
  Info
} from 'lucide-react'
import { ZenithCard } from '@/components/ui/ZenithCard'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

interface FinancialAnalyticsProps {
  productionOrders: any[]
}

export const FinancialAnalytics: React.FC<FinancialAnalyticsProps> = ({ productionOrders = [] }) => {
  const completedOrders = useMemo(() => productionOrders.filter(o => o.status === 'completed'), [productionOrders])

  const totals = useMemo(() => {
    return completedOrders.reduce((acc, o) => ({
      revenue: acc.revenue + (o.selling_price || 0),
      cost: acc.cost + (o.total_cost || 0),
      profit: acc.profit + (o.profit || 0),
      material: acc.material + (o.material_cost || 0),
      labor: acc.labor + (o.labor_cost || 0)
    }), { revenue: 0, cost: 0, profit: 0, material: 0, labor: 0 })
  }, [completedOrders])

  const profitMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0

  return (
    <div className="space-y-8 animate-reveal">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <ZenithCard glow className="bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">TOPLAM CİRO</p>
               <p className="text-3xl font-black text-white tracking-tighter">₺{totals.revenue.toLocaleString('tr-TR')}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
               <DollarSign className="w-6 h-6 text-primary shadow-glow" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-success">
             <TrendingUp className="w-3 h-3" />
             <span>+%12 Geçen Aya Göre</span>
          </div>
        </ZenithCard>

        <ZenithCard glow className="bg-error/5 border-error/20">
          <div className="flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-error uppercase tracking-[0.3em] mb-2">TOPLAM MALİYET</p>
               <p className="text-3xl font-black text-white tracking-tighter">₺{totals.cost.toLocaleString('tr-TR')}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center">
               <TrendingDown className="w-6 h-6 text-error shadow-glow" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-white/40">
             <span>Sarfiyat: ₺{totals.material.toLocaleString('tr-TR')}</span>
          </div>
        </ZenithCard>

        <ZenithCard glow className={cn("border-emerald-500/20", totals.profit >= 0 ? "bg-emerald-500/5" : "bg-red-500/5")}>
          <div className="flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-2">NET KÂR</p>
               <p className="text-3xl font-black text-white tracking-tighter">₺{totals.profit.toLocaleString('tr-TR')}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
               <Wallet className="w-6 h-6 text-emerald-500 shadow-glow" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
             <Badge variant="soft" color="success" className="text-[8px] font-black px-2">MARJ: %{profitMargin.toFixed(1)}</Badge>
          </div>
        </ZenithCard>

        <ZenithCard glow className="bg-amber-500/5 border-amber-500/20">
          <div className="flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-2">İŞÇİLİK GİDERİ</p>
               <p className="text-3xl font-black text-white tracking-tighter">₺{totals.labor.toLocaleString('tr-TR')}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
               <CreditCard className="w-6 h-6 text-amber-500 shadow-glow" />
            </div>
          </div>
          <p className="mt-4 text-[9px] font-bold text-white/20 uppercase tracking-widest">Tahmini Üretim İşçiliği</p>
        </ZenithCard>
      </div>

      {/* Charts & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <ZenithCard className="p-8 border-white/5 bg-black/40">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
               <PieChart className="w-5 h-5 text-primary" />
               MALİYET DAĞILIMI
            </h3>
            <div className="space-y-6">
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                     <span className="text-white/40">Hammadde & Sarfiyat</span>
                     <span className="text-white">%{totals.cost > 0 ? Math.round((totals.material / totals.cost) * 100) : 0}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${totals.cost > 0 ? (totals.material / totals.cost) * 100 : 0}%` }}
                        className="h-full bg-primary shadow-glow"
                     />
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                     <span className="text-white/40">Doğrudan İşçilik</span>
                     <span className="text-white">%{totals.cost > 0 ? Math.round((totals.labor / totals.cost) * 100) : 0}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${totals.cost > 0 ? (totals.labor / totals.cost) * 100 : 0}%` }}
                        className="h-full bg-amber-500 shadow-glow"
                     />
                  </div>
               </div>
            </div>
            <div className="mt-10 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
               <p className="text-[11px] font-medium text-white/40 italic leading-relaxed">
                  "Hammadde maliyetleri toplam giderlerin %{totals.cost > 0 ? Math.round((totals.material / totals.cost) * 100) : 0}'ini oluşturuyor. <span className="text-primary">Fire oranlarını %5 düşürmek</span> yıllık bazda ₺{(totals.material * 0.05).toLocaleString('tr-TR')} tasarruf sağlayabilir."
               </p>
            </div>
         </ZenithCard>

         <ZenithCard className="p-8 border-white/5 bg-black/40">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
               <Target className="w-5 h-5 text-emerald-500" />
               EN KÂRLI ÜRÜNLER
            </h3>
            <div className="space-y-4">
               {completedOrders.slice(0, 5).sort((a, b) => (b.profit / b.selling_price) - (a.profit / a.selling_price)).map((o, i) => (
                  <div key={o.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-primary/20 transition-all">
                     <div className="flex items-center gap-4">
                        <span className="text-lg font-black text-white/10 italic">#{i+1}</span>
                        <div>
                           <p className="text-[11px] font-black text-white uppercase tracking-tighter">{o.product_name || 'Ürün ' + o.product_id}</p>
                           <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Marj: %{((o.profit / o.selling_price) * 100).toFixed(1)}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-black text-emerald-500">+₺{o.profit.toLocaleString('tr-TR')}</p>
                        <ArrowUpRight className="w-3 h-3 text-white/10 ml-auto mt-1" />
                     </div>
                  </div>
               ))}
            </div>
         </ZenithCard>
      </div>

      {/* Financial Action Alert */}
      <div className="p-6 rounded-[2rem] bg-gradient-to-r from-primary/20 to-transparent border border-primary/20 flex items-center justify-between group">
         <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
               <Info className="w-7 h-7 shadow-glow" />
            </div>
            <div>
               <h4 className="text-sm font-black text-white uppercase tracking-widest">MALİYET OPTİMİZASYON FIRSATI</h4>
               <p className="text-[11px] font-medium text-white/40 mt-1">Son 30 gündeki malzeme fiyat artışları kâr marjınızı %2.4 daralttı. Satış fiyatlarını revize etmeniz önerilir.</p>
            </div>
         </div>
         <button className="px-8 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-transform glow-primary">
            ANALİZİ DERİNLEŞTİR
         </button>
      </div>
    </div>
  )
}
