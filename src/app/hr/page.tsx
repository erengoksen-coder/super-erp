'use client'

import React, { useState } from 'react'
import { 
  Users, 
  UserPlus, 
  Calendar, 
  Clock, 
  Star, 
  TrendingUp, 
  Award, 
  Search, 
  Filter, 
  MoreHorizontal,
  ChevronRight,
  Briefcase,
  Heart,
  Zap,
  Activity
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { ZenithCard } from '@/components/ui/ZenithCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { useApi } from '@/lib/api/client'
import { PersonnelPerformance } from '@/components/hr/PersonnelPerformance'
import { 
  DollarSign, 
  CreditCard, 
  Download, 
  Target
} from 'lucide-react'

export default function HRPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'employees' | 'performance' | 'attendance' | 'payroll'>('employees')

  const { data: employees = [], isLoading: isEmployeesLoading } = useApi<any[]>('/api/hr/employees')
  const { data: dashboardData } = useApi<any>('/api/hr/dashboard')
  const { data: operations = [] } = useApi<any[]>('/api/production/order-operations')
  const { data: attendance = [] } = useApi<any[]>('/api/hr/attendance')

  const stats = dashboardData?.stats || {
    total_employees: 0,
    present_today: 0,
    absent_today: 0,
    on_leave: 0
  }

  return (
    <AppDashboardLayout 
      title="İnsan Kaynakları" 
      subtitle="Yetenek yönetimi ve operasyonel verimlilik"
      icon={Users}
      actions={
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="glass bg-white/5 border-white/10">
            <Calendar className="w-4 h-4 mr-2" /> Vardiya Planla
          </Button>
          <Button variant="solid" color="primary" size="sm" className="glow-primary">
            <UserPlus className="w-4 h-4 mr-2" /> Yeni Personel
          </Button>
        </div>
      }
    >
      <div className="space-y-8 pb-20 animate-reveal">
        
        {/* Navigation Tabs - Zenith Style */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-2 glass rounded-[2.5rem] border border-white/5 shadow-2xl">
            {[
              { id: 'employees', label: 'PERSONEL', icon: Users },
              { id: 'performance', label: 'PERFORMANS', icon: Target },
              { id: 'attendance', label: 'DEVAMSIZLIK', icon: Clock },
              { id: 'payroll', label: 'BORDRO', icon: CreditCard }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={cn(
                  "flex items-center gap-3 px-8 py-3.5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                  activeTab === t.id ? "bg-primary text-white glow-primary" : "text-white/20 hover:text-white/40"
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* HR Intelligence Bridge */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ZenithCard glow className="bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">TOPLAM KADRO</p>
                <p className="text-3xl font-black text-white italic">{stats.total_employees}</p>
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">{stats.on_leave} İZİNLİ</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                <Users className="w-7 h-7 text-primary" />
              </div>
            </div>
          </ZenithCard>

          <ZenithCard glow className="bg-emerald-500/5 border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">BUGÜN BURADA</p>
                <p className="text-3xl font-black text-white italic">{stats.present_today}</p>
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">%{Math.round((stats.present_today / stats.total_employees) * 100) || 0} KATILIM</p>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <Heart className="w-7 h-7 text-emerald-500" />
              </div>
            </div>
          </ZenithCard>

          <ZenithCard glow className="bg-cyan-500/5 border-cyan-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-1">GENEL VERİMLİLİK</p>
                <p className="text-3xl font-black text-white italic">%91.8</p>
                <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest mt-1">HEDEF %95</p>
              </div>
              <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                <Zap className="w-7 h-7 text-cyan-500" />
              </div>
            </div>
          </ZenithCard>

          <ZenithCard className="bg-white/[0.02] border-white/5 flex flex-col justify-center">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-primary" /> YAKLAŞAN DOĞUM GÜNLERİ
            </h4>
            <div className="flex -space-x-2">
               {dashboardData?.upcomingBirthdays?.slice(0, 3).map((b: any, i: number) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-white/10 border-2 border-black flex items-center justify-center text-[10px] font-black text-white/40 uppercase">
                     {b.first_name?.[0]}{b.last_name?.[0]}
                  </div>
               ))}
               {dashboardData?.upcomingBirthdays?.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-black flex items-center justify-center text-[10px] font-black text-primary">
                     +{dashboardData.upcomingBirthdays.length - 3}
                  </div>
               )}
            </div>
          </ZenithCard>
        </div>

        {activeTab === 'employees' && (
           <>
              {/* Search & Filters */}
              <ZenithCard className="p-4 flex flex-col md:flex-row items-center gap-4 bg-white/[0.02] border-white/5">
                  <div className="relative flex-1 group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="İsim, Departman veya Rol Ara..." 
                      className="pl-12 w-full h-12 bg-white/5 border-white/10 group-hover:border-white/20 focus:border-primary/50 transition-all font-bold rounded-2xl" 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button variant="ghost" className="h-12 px-6 bg-white/5 border-white/10 hover:bg-white/10 rounded-2xl text-[10px] font-black tracking-widest uppercase">
                        <Filter className="w-4 h-4 mr-2 text-primary" /> Filtrele
                    </Button>
                  </div>
              </ZenithCard>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Employee List */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-black text-white/30 uppercase tracking-[0.3em] ml-2">PERSONEL DİZİNİ</h3>
                    {isEmployeesLoading ? (
                       <div className="flex flex-col items-center justify-center py-20">
                          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                       </div>
                    ) : (
                      employees.filter(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())).map((emp, i) => (
                        <ZenithCard key={emp.id} className="p-0 overflow-hidden group hover:bg-white/[0.04] transition-all cursor-pointer border-white/5" animate={true} delay={i * 100}>
                          <div className="p-5 flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-lg font-black text-white group-hover:border-primary/50 group-hover:text-primary transition-all shadow-inner uppercase">
                              {emp.first_name?.[0]}{emp.last_name?.[0]}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="text-lg font-black text-white tracking-tight uppercase">{emp.first_name} {emp.last_name}</h4>
                                <Badge variant="soft" color={emp.status === 'active' ? 'success' : 'secondary'} className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                                  {emp.status === 'active' ? 'AKTİF' : 'PASİF'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                                  <Briefcase className="w-3 h-3" /> {emp.title || 'Belirtilmemiş'}
                                </span>
                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                                  <Activity className="w-3 h-3" /> {emp.department || 'Genel'}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Button variant="ghost" size="sm" className="w-10 h-10 p-0 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/50">
                                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-primary" />
                              </Button>
                            </div>
                          </div>
                        </ZenithCard>
                      ))
                    )}
                </div>

                {/* Quick Actions & Insights */}
                <div className="space-y-6">
                    <ZenithCard className="bg-primary/5 border-primary/20 p-8">
                       <div className="flex items-center gap-3 mb-6">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          <h3 className="text-[11px] font-black text-white uppercase tracking-widest">HIZLI ANALİZ</h3>
                       </div>
                       <p className="text-xs text-white/40 leading-relaxed italic mb-8">
                          "Personel devir oranı geçen aya göre <span className="text-emerald-500 font-black">%12 düştü</span>. Bu, çalışma ortamı iyileştirmelerinin etkisini gösteriyor."
                       </p>
                       <Button className="w-full h-12 bg-primary/20 border border-primary/30 text-primary text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary/30 transition-all">
                          MEMNUNİYET ANKETİ BAŞLAT
                       </Button>
                    </ZenithCard>
                </div>
              </div>
           </>
        )}

        {activeTab === 'performance' && <PersonnelPerformance employees={employees} operations={operations} />}

        {activeTab === 'attendance' && (
           <ZenithCard className="p-16 flex flex-col items-center justify-center text-center space-y-6 bg-black/40 border-white/5">
              <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                 <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-widest">BUGÜNÜN DEVAMSIZLIK ÇİZELGESİ</h3>
                <p className="text-xs text-white/40 mt-2 max-w-md">Personel giriş-çıkış saatleri ve mazeretli izinlerin anlık takibi.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                 <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-2xl font-black text-white">{stats.present_today}</p>
                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">MESAİDE</p>
                 </div>
                 <div className="p-6 rounded-3xl bg-error/5 border border-error/20">
                    <p className="text-2xl font-black text-white">{stats.absent_today}</p>
                    <p className="text-[9px] font-bold text-error uppercase tracking-widest mt-1">GELMEDİ</p>
                 </div>
              </div>
              <Button variant="solid" color="primary" className="px-12 h-12 rounded-2xl glow-primary">ÇİZELGEYİ DÜZENLE</Button>
           </ZenithCard>
        )}

        {activeTab === 'payroll' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ZenithCard className="p-10 bg-black/40 border-white/5 flex flex-col items-center justify-center text-center">
                 <CreditCard className="w-12 h-12 text-primary mb-6 opacity-20" />
                 <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">BORDRONUNU HAZIRLA</h3>
                 <p className="text-xs text-white/40 mb-8">Puantaj ve performans verilerine göre maaş hesaplamasını başlatın.</p>
                 <Button variant="glass" className="w-full border-white/10 hover:bg-white/5">HESAPLAMAYI BAŞLAT</Button>
              </ZenithCard>
              <ZenithCard className="p-10 bg-black/40 border-white/5 flex flex-col items-center justify-center text-center">
                 <Download className="w-12 h-12 text-cyan-500 mb-6 opacity-20" />
                 <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">TOPLU ÖDEME LİSTESİ</h3>
                 <p className="text-xs text-white/40 mb-8">Banka formatına uygun toplu maaş ödeme dosyasını indirin.</p>
                 <Button variant="glass" className="w-full border-white/10 hover:bg-white/5">DOSYAYI İNDİR</Button>
              </ZenithCard>
           </div>
        )}

      </div>
    </AppDashboardLayout>
  )
}
