'use client'

import React, { useState } from 'react'
import { 
  Users, 
  Target, 
  TrendingUp, 
  MessageSquare, 
  Calendar, 
  Filter, 
  Search, 
  Plus,
  ChevronRight,
  DollarSign,
  Clock,
  Briefcase,
  Layers,
  ArrowRightLeft
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { ZenithCard } from '@/components/ui/ZenithCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useApi } from '@/lib/api/client'
import { cn } from '@/lib/cn'

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'leads' | 'activities'>('pipeline')
  const { data: opportunities = [], isLoading: isOppLoading } = useApi<any[]>('/api/crm/opportunities')
  const { data: leads = [], isLoading: isLeadsLoading } = useApi<any[]>('/api/crm/leads')

  return (
    <AppDashboardLayout
      title="Müşteri İlişkileri (CRM)"
      subtitle="Fırsat takibi, potansiyel müşteri yönetimi ve satış hunisi"
      icon={Target}
      actions={
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="glass bg-white/5 border-white/10">
            <Layers className="w-4 h-4 mr-2" /> Pipeline Yönet
          </Button>
          <Button variant="solid" color="primary" size="sm" className="glow-primary">
            <Plus className="w-4 h-4 mr-2" /> Yeni Fırsat
          </Button>
        </div>
      }
    >
      <div className="space-y-8 pb-20 animate-reveal">
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-2 glass rounded-[2.5rem] border border-white/5 shadow-2xl">
            {[
              { id: 'pipeline', label: 'SATIŞ HUNİSİ', icon: TrendingUp },
              { id: 'leads', label: 'POTANSİYEL MÜŞTERİLER', icon: Users },
              { id: 'activities', label: 'AKTİVİTELER', icon: MessageSquare }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={cn(
                  "flex items-center gap-3 px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                  activeTab === t.id ? "bg-primary text-white glow-primary" : "text-white/20 hover:text-white/40"
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'pipeline' && (
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-h-[600px]">
              {[
                { id: 'qualification', label: 'KALİFİKASYON', color: 'bg-blue-500' },
                { id: 'proposal', label: 'TEKLİF', color: 'bg-amber-500' },
                { id: 'negotiation', label: 'PAZARLIK', color: 'bg-orange-500' },
                { id: 'closed_won', label: 'KAZANILDI', color: 'bg-emerald-500' }
              ].map((stage) => (
                <div key={stage.id} className="flex flex-col gap-4">
                   <div className="flex items-center justify-between px-2">
                      <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest">{stage.label}</h3>
                      <Badge variant="glass" className="text-[9px] bg-white/5 border-white/5">{opportunities.filter(o => o.stage === stage.id).length}</Badge>
                   </div>
                   <div className={cn("h-1 w-full rounded-full opacity-20", stage.color)} />
                   
                   <div className="flex-1 space-y-4">
                      {opportunities.filter(o => o.stage === stage.id).map((opp) => (
                        <ZenithCard key={opp.id} className="p-4 bg-white/[0.03] border-white/5 hover:border-white/10 transition-all cursor-grab active:cursor-grabbing">
                           <div className="flex justify-between items-start mb-3">
                              <h4 className="text-[11px] font-black text-white uppercase tracking-tight">{opp.title}</h4>
                              <p className="text-[10px] font-black text-primary font-mono">{opp.value?.toLocaleString()} ₺</p>
                           </div>
                           <p className="text-[9px] text-white/30 uppercase font-bold mb-4">{opp.account_name || 'Bilinmeyen Müşteri'}</p>
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                 <Clock className="w-3 h-3 text-white/20" />
                                 <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{opp.expected_close_date || 'Tarih Yok'}</span>
                              </div>
                              <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-black">
                                 {opp.assigned_to?.[0] || 'A'}
                              </div>
                           </div>
                        </ZenithCard>
                      ))}
                      <Button variant="ghost" className="w-full h-12 border-dashed border-2 border-white/5 text-white/20 hover:border-white/10 hover:text-white/40 rounded-2xl text-[9px] font-black uppercase tracking-widest">
                         <Plus className="w-3 h-3 mr-2" /> EKLE
                      </Button>
                   </div>
                </div>
              ))}
           </div>
        )}

        {activeTab === 'leads' && (
           <div className="space-y-6">
              <ZenithCard className="p-4 flex flex-col md:flex-row items-center gap-4 bg-white/[0.02] border-white/5">
                  <div className="relative flex-1 group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="İsim, Şirket veya Kaynak Ara..." 
                      className="pl-12 w-full h-12 bg-white/5 border-white/10 group-hover:border-white/20 focus:border-primary/50 transition-all font-bold rounded-2xl" 
                    />
                  </div>
                  <Button variant="ghost" className="h-12 px-6 bg-white/5 border-white/10 hover:bg-white/10 rounded-2xl text-[10px] font-black tracking-widest uppercase">
                      <Filter className="w-4 h-4 mr-2 text-primary" /> Filtrele
                  </Button>
              </ZenithCard>

              <div className="grid grid-cols-1 gap-4">
                 {isLeadsLoading ? (
                    <div className="py-20 flex justify-center"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                 ) : (
                    leads.map((lead, i) => (
                      <ZenithCard key={lead.id} className="p-0 overflow-hidden group hover:bg-white/[0.04] transition-all cursor-pointer border-white/5">
                        <div className="p-5 flex items-center gap-6">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-sm font-black text-white">
                            {lead.first_name?.[0]}{lead.last_name?.[0]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-sm font-black text-white tracking-tight uppercase">{lead.first_name} {lead.last_name}</h4>
                              <Badge variant="soft" color="info" className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                                {lead.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                                <Briefcase className="w-3 h-3" /> {lead.company_name || 'Bireysel'}
                              </span>
                              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                                <ArrowRightLeft className="w-3 h-3" /> {lead.source}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                             <div className="text-right">
                                <p className="text-[10px] font-black text-white/40 uppercase">PUAN</p>
                                <p className={cn("text-sm font-black", lead.score > 70 ? "text-emerald-500" : "text-white")}>{lead.score}</p>
                             </div>
                             <Button variant="ghost" size="sm" className="w-10 h-10 p-0 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/50">
                                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-primary" />
                             </Button>
                          </div>
                        </div>
                      </ZenithCard>
                    ))
                 )}
              </div>
           </div>
        )}

        {activeTab === 'activities' && (
           <ZenithCard className="p-20 flex flex-col items-center justify-center text-center space-y-6 bg-black/40 border-white/5">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                 <MessageSquare className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <div>
                 <h3 className="text-xl font-black text-white uppercase tracking-widest">SATIŞ AKTİVİTE TAKİBİ</h3>
                 <p className="text-xs text-white/40 mt-2 max-w-md">Görüşmeler, e-postalar ve toplantılar üzerinden satış performansınızı maksimize edin.</p>
              </div>
              <Badge variant="glass" className="text-[10px] font-black tracking-[0.3em] px-8 py-3 rounded-2xl">GELECEK GÜNCELLEMEDE</Badge>
           </ZenithCard>
        )}
      </div>
    </AppDashboardLayout>
  )
}
