'use client'

import React from 'react'
import { 
  Users, 
  TrendingUp, 
  Globe, 
  MapPin, 
  Zap,
  BarChart3,
  Award,
  Search,
  Filter,
  Plus
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { ZenithCard } from '@/components/ui/ZenithCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useApi } from '@/lib/api/client'
import { DealerIntelligence } from '@/components/sales/DealerIntelligence'

export default function DealerPerformancePage() {
  const { data: orders = [], isLoading: isOrdersLoading } = useApi<any[]>('/api/orders')

  return (
    <AppDashboardLayout
      title="Bayi Performans Zekası"
      subtitle="Stratejik iş ortakları analizi ve satış hacmi optimizasyonu"
      icon={Globe}
      actions={
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="glass bg-white/5 border-white/10">
            <Award className="w-4 h-4 mr-2" /> Teşvik Planla
          </Button>
          <Button variant="solid" color="primary" size="sm" className="glow-primary">
            <Plus className="w-4 h-4 mr-2" /> Yeni Bayi Ekle
          </Button>
        </div>
      }
    >
      <div className="space-y-8 pb-20 animate-reveal">
        {/* Intelligence Bridge */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <ZenithCard glow className="bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">TOPLAM AKTİF BAYİ</p>
                    <p className="text-3xl font-black text-white italic">24</p>
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">4 YENİ BU AY</p>
                 </div>
                 <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                    <Users className="w-7 h-7 text-primary" />
                 </div>
              </div>
           </ZenithCard>

           <ZenithCard glow className="bg-cyan-500/5 border-cyan-500/20">
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-1">ORTALAMA SİPARİŞ DEĞERİ</p>
                    <p className="text-3xl font-black text-white italic">42.5K <span className="text-sm">₺</span></p>
                    <p className="text-[9px] font-bold text-cyan-500 uppercase tracking-widest mt-1">↑ %8.5 VERİMLİLİK ARTIŞI</p>
                 </div>
                 <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                    <TrendingUp className="w-7 h-7 text-cyan-500" />
                 </div>
              </div>
           </ZenithCard>

           <ZenithCard glow className="bg-emerald-500/5 border-emerald-500/20">
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">COĞRAFİ KAPSAM</p>
                    <p className="text-3xl font-black text-white italic">12 <span className="text-sm">BÖLGE</span></p>
                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">TR GENELİ %82</p>
                 </div>
                 <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                    <MapPin className="w-7 h-7 text-emerald-500" />
                 </div>
              </div>
           </ZenithCard>
        </div>

        {/* Main Intelligence Section */}
        {isOrdersLoading ? (
           <div className="py-40 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Bayi verileri analiz ediliyor...</p>
           </div>
        ) : (
           <DealerIntelligence orders={orders} />
        )}

        {/* Action Hub */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <ZenithCard className="p-10 bg-black/40 border-white/5 flex flex-col items-center justify-center text-center">
              <Zap className="w-12 h-12 text-primary mb-6 opacity-20" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">BAYİ TEŞVİK KAMPANYASI</h3>
              <p className="text-xs text-white/40 mb-8 max-w-sm">Düşük performans gösteren bayileri yeniden aktive etmek için otomatik kampanya kurgulayın.</p>
              <Button variant="glass" className="w-full border-white/10 hover:bg-white/5">KAMPANYA OLUŞTUR</Button>
           </ZenithCard>
           <ZenithCard className="p-10 bg-black/40 border-white/5 flex flex-col items-center justify-center text-center">
              <BarChart3 className="w-12 h-12 text-cyan-500 mb-6 opacity-20" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">BÖLGESEL SATIŞ HARİTASI</h3>
              <p className="text-xs text-white/40 mb-8 max-w-sm">Bayi dağılımını ve bölgesel pazar paylarını interaktif harita üzerinde inceleyin.</p>
              <Button variant="glass" className="w-full border-white/10 hover:bg-white/5">HARİTAYI AÇ</Button>
           </ZenithCard>
        </div>
      </div>
    </AppDashboardLayout>
  )
}
