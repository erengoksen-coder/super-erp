'use client'

import React from 'react'
import Link from 'next/link'
import { 
  Boxes, 
  ClipboardList, 
  Package, 
  ShoppingCart, 
  Wallet, 
  Terminal, 
  ChevronRight, 
  Code2, 
  Layers, 
  Cpu, 
  Activity, 
  Globe,
  Zap,
  ShieldCheck,
  Server
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

const categories = [
  { id: 'accounting', name: 'Muhasebe / Finans', icon: Wallet, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { id: 'sales', name: 'Satış & Sipariş', icon: ShoppingCart, color: 'text-primary', bg: 'bg-primary/10' },
  { id: 'procurement', name: 'Satın Alma', icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'inventory', name: 'Stok / Depo', icon: Package, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { id: 'production', name: 'Üretim / MRP', icon: Boxes, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
]

export default function ApiCatalogPage() {
  return (
    <AppDashboardLayout
      title="API Geliştirici Kataloğu"
      subtitle="Sistem entegrasyonu için uç noktalar, şemalar ve dökümantasyon"
      icon={Terminal}
    >
      <div className="space-y-10 animate-reveal">
         {/* Welcome Banner */}
         <div className="p-10 rounded-[2.5rem] bg-primary/5 border border-primary/10 relative overflow-hidden group">
            <Server className="absolute -right-8 -bottom-8 w-48 h-48 text-primary/5 group-hover:scale-110 transition-transform duration-1000" />
            <div className="relative z-10 max-w-2xl">
               <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Uç Nokta Entegrasyonu</h2>
               <p className="text-sm font-medium text-foreground/40 leading-relaxed uppercase tracking-widest italic">
                  Super ERP Platinum, dış servislerle tam uyumlu RESTful API mimarisi sunar. Tüm veri alışverişi JSON formatında ve Bearer Token doğrulaması ile gerçekleştirilmektedir.
               </p>
               <div className="flex gap-4 mt-8">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] font-black tracking-widest text-foreground/60 uppercase">
                     <ShieldCheck className="w-3.5 h-3.5 text-success shadow-glow-sm" />
                     Ssl Secured
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5 text-[10px] font-black tracking-widest text-foreground/60 uppercase">
                     <Zap className="w-3.5 h-3.5 text-primary shadow-glow-sm" />
                     V1 Endpoint
                  </div>
               </div>
            </div>
         </div>

         {/* Categories Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((item, i) => (
               <Link key={item.id} href={`/api-catalog/${item.id}`} className="block group">
                  <Card variant="glass" className="h-full hover:scale-[1.02] transition-all border-white/5 hover:border-primary/20 bg-white/[0.01] hover:bg-white/[0.04]">
                     <CardBody className="p-8">
                        <div className="flex flex-col h-full">
                           <div className="flex items-center justify-between mb-8">
                              <div className={cn("p-4 rounded-2xl border border-white/5 transition-all group-hover:scale-110 shadow-glow-sm", item.bg, item.color)}>
                                 <item.icon className="w-8 h-8" />
                              </div>
                              <ChevronRight className="w-6 h-6 text-foreground/10 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                           </div>
                           
                           <div>
                              <h3 className="text-lg font-black uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">{item.name}</h3>
                              <p className="text-[10px] font-bold text-foreground/30 uppercase mt-2 tracking-widest leading-relaxed italic">
                                 Sistem kaynaklarına erişmek, veri okumak ve işlem gerçekleştirmek için gerekli metodlar.
                              </p>
                           </div>
                           
                           <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <Code2 className="w-3.5 h-3.5 text-foreground/20" />
                                 <span className="text-[9px] font-black text-foreground/40 uppercase tracking-widest">Post / Get / Patch</span>
                              </div>
                              <Badge variant="soft" className="text-[8px] font-black">12 ENDPOINT</Badge>
                           </div>
                        </div>
                     </CardBody>
                  </Card>
               </Link>
            ))}

            {/* Coming Soon Card */}
            <div className="p-8 rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center opacity-30 grayscale hover:grayscale-0 transition-all cursor-not-allowed">
               <Globe className="w-12 h-12 mb-4" />
               <h3 className="text-sm font-black uppercase tracking-widest">Webhooklar & Olaylar</h3>
               <p className="text-[10px] font-bold uppercase mt-2 tracking-tighter italic">Yeni NESİL Tetikleyiciler</p>
            </div>
         </div>

         {/* Footer Stats */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
               <Activity className="w-5 h-5 text-primary opacity-40 shadow-glow" />
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">Sistem Yükü</span>
                  <span className="text-xs font-bold font-mono">1.2ms Ort. Gecikme</span>
               </div>
            </div>
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
               <Layers className="w-5 h-5 text-secondary opacity-40 shadow-glow" />
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">Entegrasyonlar</span>
                  <span className="text-xs font-bold font-mono">14 Aktif Uygulama</span>
               </div>
            </div>
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
               <Cpu className="w-5 h-5 text-success opacity-40 shadow-glow" />
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-foreground/20 uppercase tracking-widest">Uptime</span>
                  <span className="text-xs font-bold font-mono">%99.99 Erişilebilirlik</span>
               </div>
            </div>
         </div>
      </div>
    </AppDashboardLayout>
  )
}
