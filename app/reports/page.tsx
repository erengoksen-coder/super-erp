'use client'

import React, { useEffect, useState } from 'react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { 
  BarChart3, 
  TrendingUp, 
  Info, 
  Printer, 
  Download, 
  PieChart, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  Target,
  Cpu,
  Zap,
  RefreshCw,
  LayoutGrid
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { fetchApi } from '@/lib/api/client'
import { EfficiencyChart } from '@/components/reports/EfficiencyChart'
import { CostAnalysisChart } from '@/components/reports/CostAnalysisChart'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/cn'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('efficiency')
  const [efficiencyData, setEfficiencyData] = useState<any>(null)
  const [costData, setCostData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadEfficiency = async () => {
    try {
      const res = await fetchApi('/api/reports/production/efficiency')
      setEfficiencyData(res)
    } catch (err) {
      toast.error('Verimlilik verileri yüklenemedi')
    }
  }

  const loadCosts = async () => {
    try {
      const res = await fetchApi('/api/reports/production/costs')
      setCostData(res)
    } catch (err) {
      toast.error('Maliyet verileri yüklenemedi')
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadEfficiency(), loadCosts()]).finally(() => setLoading(false))
  }, [])

  return (
    <AppDashboardLayout
      title="Analitik & Raporlama"
      subtitle="Üretim performansı, maliyet optimizasyonu ve verimlilik metrikleri"
      icon={BarChart3}
      actions={
        <div className="flex items-center gap-2">
           <Button variant="soft" color="secondary" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Yazdır
           </Button>
           <Button variant="solid" color="primary" size="sm" disabled className="shadow-lg shadow-primary/20">
              <Download className="w-4 h-4 mr-2" /> Dışa Aktar
           </Button>
        </div>
      }
    >
      <div className="space-y-6 animate-reveal">
         {/* Info Banner */}
         <div className="p-4 bg-primary/5 rounded-3xl border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Info className="w-4 h-4 shadow-glow" />
               </div>
               <p className="text-[11px] font-black uppercase tracking-widest text-foreground/60 italic">Veriler anlık üretim ve stok hareketlerine göre gerçek zamanlı güncellenmektedir.</p>
            </div>
            <div className="flex items-center gap-2">
               <Badge variant="glass" className="text-[10px] uppercase font-black px-4 bg-white/5 border-white/5">SON GÜNCELLEME: ŞİMDİ</Badge>
            </div>
         </div>

         <Tabs defaultValue="efficiency" onValueChange={setActiveTab} className="space-y-8">
            <div className="flex justify-center">
               <TabsList className="glass p-1.5 rounded-2xl border border-white/5 shadow-2xl inline-flex h-auto">
                  <TabsTrigger 
                     value="efficiency" 
                     className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-glow flex items-center gap-2"
                  >
                     <TrendingUp className="w-4 h-4" /> VERİMLİLİK
                  </TabsTrigger>
                  <TabsTrigger 
                     value="costs" 
                     className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-glow flex items-center gap-2"
                  >
                     <PieChart className="w-4 h-4" /> MALİYET & KÂR
                  </TabsTrigger>
               </TabsList>
            </div>

            <TabsContent value="efficiency" className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
               <Card variant="glass" className="border-white/5 overflow-hidden">
                  <CardHeader className="p-6 border-b border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-primary" />
                        <h3 className="font-black uppercase tracking-widest text-sm text-foreground/80">İstasyon Bazlı Üretim Verimliliği</h3>
                     </div>
                     <Badge color="success" variant="soft" className="text-[10px] font-black">CANLI AKIŞ</Badge>
                  </CardHeader>
                  <CardBody className="p-8">
                     <EfficiencyChart data={efficiencyData?.stations || []} loading={loading} />
                  </CardBody>
               </Card>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card variant="glass" className="border-white/5">
                     <CardHeader className="p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                           <Target className="w-5 h-5 text-secondary" />
                           <div className="flex flex-col">
                              <h3 className="font-black uppercase tracking-widest text-sm text-foreground/80">Personel Performansı</h3>
                              <p className="text-[10px] font-bold text-foreground/30 mt-0.5 tracking-tighter">PLANLANAN SÜREYİ YAKALAMA ORANI (%)</p>
                           </div>
                        </div>
                     </CardHeader>
                     <CardBody className="p-8">
                        <div className="space-y-8">
                           {efficiencyData?.personnel?.map((p: any) => (
                              <div key={p.name} className="flex flex-col gap-3 group">
                                 <div className="flex justify-between items-end">
                                    <span className="text-xs font-black uppercase tracking-widest text-foreground/60 group-hover:text-primary transition-colors">{p.name}</span>
                                    <span className={cn("text-sm font-black tracking-tighter", p.efficiency >= 100 ? 'text-success' : 'text-warning')}>%{p.efficiency}</span>
                                 </div>
                                 <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div 
                                       className={cn(
                                          "h-full rounded-full transition-all duration-1000 shadow-glow-sm", 
                                          p.efficiency >= 100 ? 'bg-success shadow-success/40' : 'bg-warning shadow-warning/40'
                                       )} 
                                       style={{ width: `${Math.min(p.efficiency, 100)}%` }}
                                    />
                                 </div>
                              </div>
                           ))}
                           {(!efficiencyData?.personnel || efficiencyData.personnel.length === 0) && (
                              <div className="flex flex-col items-center justify-center py-20 opacity-20 italic">
                                 <LayoutGrid className="w-12 h-12 mb-4" />
                                 <p className="text-xs font-black uppercase tracking-widest">Veri bulunamadı</p>
                              </div>
                           )}
                        </div>
                     </CardBody>
                  </Card>

                  <Card variant="glass" className="border-white/5">
                     <CardHeader className="p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                           <Cpu className="w-5 h-5 text-error" />
                           <div className="flex flex-col">
                              <h3 className="font-black uppercase tracking-widest text-sm text-foreground/80">Darboğaz Analizi</h3>
                              <p className="text-[10px] font-bold text-foreground/30 mt-0.5 tracking-tighter">GEÇİKMELİ İSTASYONLARIN TESPİTİ</p>
                           </div>
                        </div>
                     </CardHeader>
                     <CardBody className="p-8">
                        <div className="space-y-6">
                           {efficiencyData?.stations?.filter((s: any) => s.efficiency < 90).map((s: any) => (
                              <div key={s.name} className="flex items-start gap-4 p-5 bg-error/5 rounded-[2rem] border border-error/10 hover:bg-error/10 transition-all group">
                                 <div className="p-3 bg-error/10 rounded-2xl text-error group-hover:scale-110 transition-transform">
                                    <AlertTriangle className="w-6 h-6 shadow-glow" />
                                 </div>
                                 <div>
                                    <p className="text-sm font-black text-error uppercase tracking-tight">{s.name} İstasyonu</p>
                                    <p className="text-[11px] font-medium text-foreground/40 mt-1 leading-relaxed italic uppercase tracking-tighter">
                                       Verimlilik %{s.efficiency} seviyesinde. Beklenen süreden %{100 - s.efficiency} daha yavaş işlem gerçekleştiriliyor.
                                    </p>
                                 </div>
                              </div>
                           ))}
                           {(efficiencyData?.stations?.every((s: any) => s.efficiency >= 90)) && (
                              <div className="flex flex-col items-center justify-center py-16 text-center animate-reveal">
                                 <div className="p-6 bg-success/10 rounded-[2.5rem] border border-success/20 mb-6 text-success group">
                                    <Zap className="w-16 h-16 shadow-glow transition-transform group-hover:scale-110" />
                                 </div>
                                 <h4 className="text-lg font-black uppercase text-foreground/80">Mükemmel Akış</h4>
                                 <p className="text-[11px] font-medium text-foreground/40 mt-2 uppercase tracking-[0.2em]">Tüm istasyonlar %90 üzerinde verimlilikle çalışıyor.</p>
                              </div>
                           )}
                        </div>
                     </CardBody>
                  </Card>
               </div>
            </TabsContent>

            <TabsContent value="costs" className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
               <Card variant="glass" className="border-white/5 overflow-hidden">
                  <CardHeader className="p-6 border-b border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <PieChart className="w-5 h-5 text-secondary" />
                        <h3 className="font-black uppercase tracking-widest text-sm text-foreground/80">Maliyet / Fiyat Analizi</h3>
                     </div>
                     <Badge color="secondary" variant="soft" className="text-[10px] font-black">MARK-UP ANALİZİ</Badge>
                  </CardHeader>
                  <CardBody className="p-8 text-white">
                     <CostAnalysisChart data={costData?.products || []} loading={loading} />
                  </CardBody>
               </Card>
               
               <Card variant="glass" className="border-white/5 overflow-hidden">
                  <CardHeader className="p-6 border-b border-white/5">
                     <div className="flex items-center gap-3">
                        <LayoutGrid className="w-5 h-5 text-primary" />
                        <div className="flex flex-col">
                           <h3 className="font-black uppercase tracking-widest text-sm text-foreground/80">Ürün Kâr Detayları</h3>
                           <p className="text-[10px] font-bold text-foreground/30 mt-0.5 tracking-tighter">REÇETE + İŞÇİLİK VS SATIŞ FİYATI</p>
                        </div>
                     </div>
                  </CardHeader>
                  <CardBody className="p-0">
                     <div className="overflow-x-auto">
                        <table className="w-full">
                           <thead>
                              <tr className="bg-white/5 border-b border-white/5 text-[9px] font-black text-foreground/40 uppercase tracking-widest">
                                 <th className="p-6 text-left">Ürün Yapısı</th>
                                 <th className="p-6 text-right">Reçete Maliyeti</th>
                                 <th className="p-6 text-right">İşçilik Maliyeti</th>
                                 <th className="p-6 text-right">Toplam Maliyet</th>
                                 <th className="p-6 text-right">Satış Fiyatı</th>
                                 <th className="p-6 text-center">Net Marj (%)</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                              {costData?.products?.map((p: any) => (
                                 <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-6">
                                       <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-primary group-hover:scale-110 transition-transform">
                                             {p.name.substring(0, 1).toUpperCase()}
                                          </div>
                                          <div className="flex flex-col text-white">
                                             <span className="text-sm font-black uppercase tracking-tight group-hover:text-primary transition-colors">{p.name}</span>
                                             <span className="text-[10px] font-mono opacity-20 font-bold">{p.sku}</span>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="p-6 text-right text-xs font-bold text-foreground/60">{p.materialCost.toLocaleString('tr-TR')} ₺</td>
                                    <td className="p-6 text-right text-xs font-bold text-foreground/60">{p.laborCost.toLocaleString('tr-TR')} ₺</td>
                                    <td className="p-6 text-right">
                                       <span className="text-sm font-black tracking-tighter shadow-glow-sm shadow-white/5">{p.totalCost.toLocaleString('tr-TR')} ₺</span>
                                    </td>
                                    <td className="p-6 text-right">
                                       <span className="text-sm font-black text-primary tracking-tighter shadow-glow-sm shadow-primary/10">{p.sellingPrice.toLocaleString('tr-TR')} ₺</span>
                                    </td>
                                    <td className="p-6 text-center">
                                       <Badge 
                                          variant="soft" 
                                          color={p.margin > 30 ? 'success' : p.margin > 15 ? 'primary' : 'error'} 
                                          className="text-[10px] font-black px-4 tracking-widest"
                                       >
                                          %{p.margin}
                                       </Badge>
                                    </td>
                                 </tr>
                              ))}
                              {(!costData?.products || costData.products.length === 0) && (
                                 <tr>
                                    <td colSpan={6} className="py-20 text-center opacity-20 font-black uppercase tracking-widest text-xs">Hesaplanmış maliyet verisi bulunamadı</td>
                                 </tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </CardBody>
               </Card>
            </TabsContent>
         </Tabs>
      </div>
    </AppDashboardLayout>
  )
}
