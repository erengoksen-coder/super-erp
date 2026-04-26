'use client'

import React, { useState } from 'react'
import { 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  BarChart3, 
  ArrowUpRight,
  Wallet,
  CreditCard,
  Target,
  Activity,
  FileText,
  Calendar,
  Download,
  Filter
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { ZenithCard } from '@/components/ui/ZenithCard'
import { Button } from '@/components/ui/Button'
import { useApi } from '@/lib/api/client'
import { FinancialAnalytics } from '@/components/finance/FinancialAnalytics'
import { cn } from '@/lib/cn'

export default function FinancePage() {
  const { data: productionOrders = [], isLoading } = useApi<any[]>('/api/production/orders')
  const [activeView, setActiveView] = useState<'overview' | 'reports' | 'cashflow'>('overview')

  return (
    <AppDashboardLayout
      title="Finansal Zeka ve Analitik"
      subtitle="Fabrika kârlılık, maliyet ve nakit akış yönetimi"
      icon={DollarSign}
      actions={
        <div className="flex gap-3">
          <Button variant="glass" size="sm" className="bg-white/5 border-white/10 text-white/40">
             <Calendar className="w-4 h-4 mr-2" />
             Son 30 Gün
          </Button>
          <Button variant="solid" color="primary" className="shadow-lg shadow-primary/25">
             <Download className="w-4 h-4 mr-2" />
             Raporu İndir
          </Button>
        </div>
      }
    >
      <div className="space-y-8 animate-reveal">
        {/* Navigation Tabs - Zenith Style */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-2 glass rounded-[2.5rem] border border-white/5 shadow-2xl">
            {[
              { id: 'overview', label: 'GENEL BAKIŞ', icon: BarChart3 },
              { id: 'reports', label: 'MALİ RAPORLAR', icon: FileText },
              { id: 'cashflow', label: 'NAKİT AKIŞI', icon: Activity }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveView(t.id as any)}
                className={cn(
                  "flex items-center gap-3 px-10 py-4 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all duration-500",
                  activeView === t.id ? "bg-primary text-white glow-primary" : "text-white/20 hover:text-white/40"
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
           <div className="flex flex-col items-center justify-center py-32 space-y-6">
              <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Finansal Veriler Analiz Ediliyor...</p>
           </div>
        ) : (
          <>
            {activeView === 'overview' && <FinancialAnalytics productionOrders={productionOrders} />}
            {activeView === 'reports' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <ZenithCard className="p-8 bg-black/40 border-white/5 flex flex-col items-center justify-center text-center space-y-4">
                    <FileText className="w-12 h-12 text-primary opacity-20" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">KÂR/ZARAR (P&L) TABLOSU</h3>
                    <p className="text-xs text-white/40 max-w-[200px]">Üretim maliyetleri ve satış gelirleri üzerinden detaylı bilanço raporu.</p>
                    <Button variant="glass" className="mt-4 border-white/10 hover:bg-white/5">GÖRÜNTÜLE</Button>
                 </ZenithCard>
                 <ZenithCard className="p-8 bg-black/40 border-white/5 flex flex-col items-center justify-center text-center space-y-4">
                    <PieChart className="w-12 h-12 text-amber-500 opacity-20" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">MALİYET MERKEZLERİ</h3>
                    <p className="text-xs text-white/40 max-w-[200px]">Hammadde, işçilik ve genel giderlerin departman bazlı dağılımı.</p>
                    <Button variant="glass" className="mt-4 border-white/10 hover:bg-white/5">GÖRÜNTÜLE</Button>
                 </ZenithCard>
              </div>
            )}
            {activeView === 'cashflow' && (
               <ZenithCard className="p-16 bg-black/40 border-white/5 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                     <Activity className="w-10 h-10 text-primary animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-[0.2em]">CANLI NAKİT AKIŞI</h3>
                    <p className="text-xs text-white/40 mt-2">Ödemeler ve tahsilatlar üzerinden anlık nakit projeksiyonu.</p>
                  </div>
                  <Badge variant="soft" color="primary" className="px-6 py-2 rounded-full font-black text-[10px] tracking-widest">GELECEK GÜNCELLEMEDE</Badge>
               </ZenithCard>
            )}
          </>
        )}
      </div>
    </AppDashboardLayout>
  )
}
