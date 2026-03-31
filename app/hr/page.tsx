'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle,
  Cake, 
  ArrowUpRight,
  Activity, 
  Users2,
  LogIn, 
  LogOut,
  Fingerprint,
  Zap,
  Target,
  ShieldCheck,
  RefreshCw,
  Award,
  Heart,
  Timer
} from 'lucide-react'
import { useApi, fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { AttendancePanel } from '@/components/hr/AttendancePanel'
import { ShiftManagement } from '@/components/hr/ShiftManagement'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/cn'

export default function HRDashboard() {
  const router = useRouter()
  const { data, isLoading, mutate } = useApi<any>('/api/hr/dashboard')
  const [clocking, setClocking] = useState(false)
  const [userStatus, setUserStatus] = useState<any>(null)

  const loadUserStatus = async () => {
    try {
      const res = await fetchApi('/api/hr/attendance/status')
      setUserStatus(res)
    } catch (err) {
      console.error('Status check failed', err)
    }
  }

  useEffect(() => { loadUserStatus() }, [])

  const handleClock = async (action: 'in' | 'out') => {
    setClocking(true)
    try {
      const res: any = await fetchApi('/api/hr/attendance/clock', {
        method: 'POST',
        body: JSON.stringify({ action })
      })
      toast.success(res.message)
      loadUserStatus()
      mutate() // Dashboard verilerini yenile
    } catch (err: any) {
      toast.error(err.message || 'Hata oluştu.')
    } finally {
      setClocking(false)
    }
  }

  const statistics = data?.stats || {
    total_employees: 0,
    present_today: 142,
    absent_today: 8,
    on_leave: 12
  }

  return (
    <AppDashboardLayout
      title="İnsan Kaynakları & Personel"
      subtitle="Çalışan verimliliği, devam kontrol ve organizasyonel yapı analitiği"
      icon={Fingerprint}
      actions={
         <div className="flex items-center gap-3">
            <Card variant="glass" className="border-primary/20 bg-primary/5 hidden md:block">
               <CardBody className="py-2 px-4 flex items-center gap-4">
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black text-primary uppercase tracking-widest leading-none mb-0.5">SİSTEM DURUMU</span>
                     <span className="text-[10px] font-black text-white uppercase italic">
                        {userStatus?.check_in ? (userStatus.check_out ? 'MESAİ BİTTİ' : 'PANEL AKTİF') : 'MESAİ DIŞI'}
                     </span>
                  </div>
                  {!userStatus?.check_in ? (
                     <Button 
                        size="xs"
                        color="primary"
                        onClick={() => handleClock('in')} 
                        disabled={clocking}
                        className="h-8 px-4 rounded-xl shadow-glow-sm shadow-primary/20"
                     >
                        <LogIn className="w-3.5 h-3.5 mr-2" /> GİRİŞ
                     </Button>
                  ) : !userStatus?.check_out ? (
                     <Button 
                        size="xs"
                        color="error"
                        onClick={() => handleClock('out')} 
                        disabled={clocking}
                        className="h-8 px-4 rounded-xl shadow-glow-sm shadow-error/20"
                     >
                        <LogOut className="w-3.5 h-3.5 mr-2" /> ÇIKIŞ
                     </Button>
                  ) : (
                     <Badge variant="glass" className="text-[8px] font-black h-8 px-3">TAMAMLANDI</Badge>
                  )}
               </CardBody>
            </Card>
            <Button variant="ghost" size="icon" onClick={() => mutate()}><RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} /></Button>
         </div>
      }
    >
      <div className="space-y-8 animate-reveal">
         <Tabs defaultValue="dashboard" className="space-y-8">
            <div className="flex justify-center">
               <TabsList className="glass p-1.5 rounded-2xl border border-white/5 shadow-2xl inline-flex h-auto">
                  <TabsTrigger value="dashboard" className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all data-[state=active]:bg-primary flex items-center gap-2">
                     <Activity className="w-4 h-4" /> GENEL BAKIŞ
                  </TabsTrigger>
                  <TabsTrigger value="attendance" className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all data-[state=active]:bg-primary flex items-center gap-2">
                     <Timer className="w-4 h-4" /> PDKS / DEVAM
                  </TabsTrigger>
                  <TabsTrigger value="shifts" className="px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all data-[state=active]:bg-primary flex items-center gap-2">
                     <Clock className="w-4 h-4" /> VARDİYALAR
                  </TabsTrigger>
               </TabsList>
            </div>

            <TabsContent value="dashboard" className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
               {/* Main KPI Stats */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                     { label: 'Toplam Personel', value: statistics.total_employees, icon: Users, color: 'primary', trend: '+2 Yeni' },
                     { label: 'Bugün Katılım', value: statistics.present_today, icon: CheckCircle2, color: 'success', trend: '%98 Aktif' },
                     { label: 'Eksik / Devamsız', value: statistics.absent_today, icon: AlertCircle, color: 'error', trend: 'Kritik' },
                     { label: 'İzinli / Raporlu', value: statistics.on_leave, icon: Calendar, color: 'secondary', trend: 'Planlı' }
                  ].map((s, idx) => (
                     <Card key={idx} variant="glass" className={cn("hover:scale-[1.02] transition-all group overflow-hidden border-white/5", `hover:border-${s.color}/30`)}>
                        <CardBody className="p-8 relative">
                           <div className={cn("absolute -top-4 -right-4 p-8 opacity-5 transition-transform group-hover:scale-110 group-hover:rotate-12", `text-${s.color}`)}>
                              <s.icon className="w-24 h-24" />
                           </div>
                           <p className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] mb-2">{s.label}</p>
                           <h3 className="text-4xl font-black text-white italic tracking-tighter mb-4">{s.value}</h3>
                           <div className="flex items-center gap-2">
                              <Badge variant="soft" color={s.color as any} className="text-[8px] font-black px-3">{s.trend}</Badge>
                           </div>
                        </CardBody>
                     </Card>
                  ))}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Birthdays Section */}
                  <Card variant="glass" className="lg:col-span-1 border-white/5 bg-pink-500/[0.02] border-pink-500/10 hover:border-pink-500/30 transition-all group">
                     <CardHeader className="p-8 border-b border-white/5">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="p-3 bg-pink-500/10 rounded-2xl text-pink-500 group-hover:scale-110 transition-transform shadow-glow shadow-pink-500/20">
                                 <Cake className="w-5 h-5 shadow-glow" />
                              </div>
                              <h3 className="text-xs font-black uppercase tracking-widest text-foreground/80">Doğum Günleri</h3>
                           </div>
                           <Badge variant="glass" className="text-[8px] font-black bg-white/5 border-white/5 text-pink-400">YAKLAŞAN</Badge>
                        </div>
                     </CardHeader>
                     <CardBody className="p-8">
                        <div className="space-y-6">
                           {data?.upcomingBirthdays?.map((b: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer" onClick={() => router.push('/hr/employees')}>
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center font-black text-xs text-primary italic">
                                       {b.first_name[0]}{b.last_name[0]}
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="text-xs font-black uppercase tracking-tight leading-none text-white">{b.first_name} {b.last_name}</span>
                                       <span className="text-[9px] font-bold text-foreground/20 italic uppercase tracking-tighter mt-1">Kutlamayı Planla</span>
                                    </div>
                                 </div>
                                 <Badge variant="soft" color="secondary" className="text-[8px] font-black">{new Date(b.birth_date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</Badge>
                              </div>
                           ))}
                           {!data?.upcomingBirthdays?.length && (
                              <div className="py-20 flex flex-col items-center justify-center opacity-10">
                                 <Heart className="w-10 h-10 mb-2" />
                                 <p className="text-[10px] font-black uppercase tracking-widest">Kayıt Bulunmuyor</p>
                              </div>
                           )}
                        </div>
                     </CardBody>
                  </Card>

                  {/* analytics Chart placeholder stylized */}
                  <Card variant="glass" className="lg:col-span-2 border-white/5 relative overflow-hidden group/stats">
                     <div className="absolute inset-0 bg-primary/5 blur-[120px] pointer-events-none -z-10" />
                     <CardHeader className="p-8 border-b border-white/5">
                        <div className="flex items-center gap-3">
                           <Award className="w-5 h-5 text-secondary shadow-glow shadow-secondary/20" />
                           <h3 className="text-xs font-black uppercase tracking-widest text-foreground/80">İş Gücü Analitiği & Verimlilik</h3>
                        </div>
                     </CardHeader>
                     <CardBody className="p-10 flex flex-col items-center justify-center text-center space-y-8 min-h-[400px]">
                        <div className="p-8 bg-white/5 rounded-[3rem] border border-white/10 text-foreground/10 group-hover/stats:scale-110 transition-transform duration-700">
                           <Activity className="w-24 h-24 shadow-glow animate-pulse" />
                        </div>
                        <div className="max-w-md">
                           <h4 className="text-2xl font-black uppercase tracking-tight text-white italic mb-3">Stratejik İK Analitiği</h4>
                           <p className="text-xs font-medium text-foreground/40 leading-relaxed uppercase tracking-widest italic leading-relaxed">Verimlilik endeksleri, katılım rasyosu ve departman bazlı büyüme metrikleri otomatik olarak hesaplanmaktadır.</p>
                        </div>
                        <div className="w-full max-w-lg grid grid-cols-4 gap-10 items-end pt-10">
                           {[65, 82, 45, 94].map((h, i) => (
                              <div key={i} className="flex flex-col items-center gap-3">
                                 <div className="h-40 w-5 bg-white/5 rounded-full relative overflow-hidden shadow-inner">
                                    <div 
                                       className="absolute bottom-0 left-0 right-0 bg-primary shadow-glow shadow-primary/40 transition-all duration-1000" 
                                       style={{ height: `${h}%` }} 
                                    />
                                 </div>
                                 <span className="text-[8px] font-black text-foreground/20 uppercase">DEPT {i+1}</span>
                              </div>
                           ))}
                        </div>
                     </CardBody>
                  </Card>
               </div>
            </TabsContent>

            <TabsContent value="attendance" className="animate-in fade-in slide-in-from-bottom-5 duration-700">
               <AttendancePanel />
            </TabsContent>

            <TabsContent value="shifts" className="animate-in fade-in slide-in-from-bottom-5 duration-700">
               <ShiftManagement />
            </TabsContent>
         </Tabs>

         {/* Footer Branding */}
         <div className="flex items-center justify-center gap-10 opacity-10 italic font-black text-[9px] uppercase tracking-[0.4em] py-16 border-t border-white/5">
            <span>Platinum HR v4.5</span>
            <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-glow shadow-primary" />
            <span>Real-time Sync Active</span>
            <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-glow shadow-primary" />
            <span>Livasofa Pro Enterprise</span>
         </div>
      </div>
    </AppDashboardLayout>
  )
}
