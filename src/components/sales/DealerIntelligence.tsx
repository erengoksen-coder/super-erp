'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Star, 
  AlertCircle,
  BarChart3,
  Globe,
  Zap,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react'
import { ZenithCard } from '@/components/ui/ZenithCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

interface DealerIntelligenceProps {
  orders: any[]
}

export const DealerIntelligence: React.FC<DealerIntelligenceProps> = ({ orders = [] }) => {
  const dealerStats = useMemo(() => {
    const stats: Record<string, any> = {}
    
    orders.forEach(order => {
      const dealer = order.dealer_name || 'Bireysel / Diğer'
      if (!stats[dealer]) {
        stats[dealer] = {
          name: dealer,
          totalVolume: 0,
          orderCount: 0,
          lastOrderDate: null,
          history: []
        }
      }
      
      const amount = Number(order.total_amount || 0)
      stats[dealer].totalVolume += amount
      stats[dealer].orderCount += 1
      
      if (!stats[dealer].lastOrderDate || new Date(order.order_date) > new Date(stats[dealer].lastOrderDate)) {
        stats[dealer].lastOrderDate = order.order_date
      }
      
      stats[dealer].history.push({ date: order.order_date, amount })
    })

    return Object.values(stats).sort((a, b) => b.totalVolume - a.totalVolume)
  }, [orders])

  const topDealers = dealerStats.slice(0, 4)

  return (
    <div className="space-y-8 animate-reveal">
      {/* Strategic Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {topDealers.map((dealer, i) => (
          <ZenithCard key={dealer.name} glow={i === 0} className={cn(
            "relative overflow-hidden group",
            i === 0 ? "bg-primary/10 border-primary/30" : "bg-white/[0.03] border-white/10"
          )}>
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <Globe className="w-24 h-24 text-white" />
            </div>
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-sm font-black text-white group-hover:text-primary transition-all">
                  {dealer.name[0]}
               </div>
               <div>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                     {i === 0 ? 'PLATINUM PARTNER' : 'STRATEJİK BAYİ'}
                  </p>
                  <h4 className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[120px]">{dealer.name}</h4>
               </div>
            </div>
            <div className="space-y-1">
               <p className="text-2xl font-black text-white italic tracking-tighter">
                  {Math.round(dealer.totalVolume / 1000)}K <span className="text-xs font-normal text-white/40 italic">₺</span>
               </p>
               <div className="flex items-center gap-2">
                  <Badge variant="soft" color="success" className="text-[8px] font-black px-1.5 py-0.5 rounded-full">
                     <TrendingUp className="w-2 h-2 mr-1" /> %14.2
                  </Badge>
                  <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{dealer.orderCount} SİPARİŞ</span>
               </div>
            </div>
          </ZenithCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Risk & Opportunity Matrix */}
         <ZenithCard className="lg:col-span-2 p-0 overflow-hidden bg-black/40 border-white/5">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
               <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  BAYİ SADAKAT VE RİSK MATRİSİ
               </h3>
               <Badge variant="glass" className="text-[9px] font-black tracking-widest">AKILLI ANALİZ</Badge>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b border-white/5 bg-white/[0.01]">
                        <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest">BAYİ ADI</th>
                        <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-center">SKOR</th>
                        <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-center">SON SİPARİŞ</th>
                        <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-right">DURUM</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                     {dealerStats.slice(0, 10).map((dealer) => {
                        const daysSinceLastOrder = Math.floor((new Date().getTime() - new Date(dealer.lastOrderDate).getTime()) / (1000 * 3600 * 24))
                        const riskLevel = daysSinceLastOrder > 60 ? 'critical' : daysSinceLastOrder > 30 ? 'warning' : 'healthy'
                        
                        return (
                           <tr key={dealer.name} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-6 py-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/40 uppercase">
                                       {dealer.name.substring(0, 2)}
                                    </div>
                                    <p className="text-[11px] font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">{dealer.name}</p>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <div className="flex items-center justify-center gap-1">
                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                    <span className="text-[11px] font-black text-white font-mono">
                                       {Math.max(40, 100 - daysSinceLastOrder)}/100
                                    </span>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                 <span className="text-[10px] font-bold text-white/40 uppercase">
                                    {daysSinceLastOrder} GÜN ÖNCE
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <Badge 
                                   variant="soft" 
                                   color={riskLevel === 'healthy' ? 'success' : riskLevel === 'warning' ? 'warning' : 'danger'}
                                   className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                                 >
                                   {riskLevel === 'healthy' ? 'AKTİF' : riskLevel === 'warning' ? 'DURGUN' : 'KAYIP RİSKİ'}
                                 </Badge>
                              </td>
                           </tr>
                        )
                     })}
                  </tbody>
               </table>
            </div>
         </ZenithCard>

         {/* Sales Intelligence / Forecast Placeholder */}
         <div className="space-y-6">
            <ZenithCard className="bg-primary/5 border-primary/20 p-8">
               <div className="flex items-center gap-3 mb-6">
                  <Zap className="w-5 h-5 text-primary" />
                  <h3 className="text-[11px] font-black text-white uppercase tracking-widest">SATIŞ TAHMİNLEME</h3>
               </div>
               <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/5">
                     <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">GELECEK AY TAHMİNİ</p>
                     <p className="text-2xl font-black text-white italic">1.2M ₺ <span className="text-emerald-500 text-xs not-italic">↑ %18</span></p>
                  </div>
                  <p className="text-[10px] text-white/30 leading-relaxed uppercase font-bold">
                     "FURKI AI: Mevcut bayi trendleri ve mevsimsel veriler, gelecek ay satışların <span className="text-white">Döşeme Grubunda</span> yoğunlaşacağını öngörüyor."
                  </p>
                  <Button className="w-full h-12 bg-primary/20 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary/30 transition-all">
                     STRATEJİK RAPORU AÇ
                  </Button>
               </div>
            </ZenithCard>

            <ZenithCard className="bg-white/[0.02] border-white/5">
               <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-[11px] font-black text-white uppercase tracking-widest">HEDEF TAKİBİ</h3>
               </div>
               <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-black text-white/40 uppercase">
                     <span>YILLIK CİRO HEDEFİ</span>
                     <span className="text-white">%68</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-cyan-400 shadow-glow" style={{ width: '68%' }} />
                  </div>
                  <p className="text-[9px] font-bold text-cyan-400/50 uppercase text-right tracking-widest">KALAN: 4.8M ₺</p>
               </div>
            </ZenithCard>
         </div>
      </div>
    </div>
  )
}
