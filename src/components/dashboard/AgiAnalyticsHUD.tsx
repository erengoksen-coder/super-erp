'use client'

import React from 'react'
import { 
  TrendingUp, 
  BarChart3, 
  Activity,
  Zap
} from 'lucide-react'
import { motion } from 'framer-motion'
import { 
  Area, 
  AreaChart, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts'
import { Card, CardBody } from '@/components/ui/Card'
import { AgingWidget } from '@/app/dashboard/AgingWidget'
import { AIPredictionsWidget } from '@/app/dashboard/AIPredictionsWidget'

interface AgiAnalyticsHUDProps {
  stats: any
  chartData: any
  loading: boolean
}

/**
 * Agi-OS Platinum: Analytics HUD
 * High-performance executive dashboard with Phase 2: Live Pulse Tracking.
 */
export function AgiAnalyticsHUD({ stats, chartData, loading }: AgiAnalyticsHUDProps) {
  const isPipeline = stats?.isPipeline || false;

  return (
    <div className="space-y-8 animate-reveal" style={{ animationDelay: '200ms' }}>
       {/* Section 1: Financial & Agentic HUD */}
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <motion.div 
              className="lg:col-span-8"
              animate={isPipeline ? { 
                boxShadow: ['0 0 0px rgba(245, 158, 11, 0)', '0 0 15px rgba(245, 158, 11, 0.1)', '0 0 0px rgba(245, 158, 11, 0)'] 
              } : {}}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
           >
              <Card variant="glass" className="h-[450px] border-white/5 p-8 relative overflow-hidden group">
                <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${isPipeline ? 'via-amber-500/50' : 'via-blue-500/50'} to-transparent opacity-50`} />
                <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
                
                <div className="flex items-center justify-between mb-8 relative z-10">
                   <div>
                      <h3 className="text-xl font-black text-foreground italic flex items-center gap-2 uppercase tracking-tighter">
                         {isPipeline ? <Zap className="w-5 h-5 text-amber-500" /> : <TrendingUp className="w-5 h-5 text-blue-400" />}
                         Ciro & Akıllı Analiz HUD
                         {isPipeline && (
                          <span className="ml-3 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-500 font-black animate-pulse shadow-glow shadow-amber-500/20">
                            PIPELINE
                          </span>
                         )}
                      </h3>
                      <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.25em] mt-1.5 ml-7">
                         {isPipeline ? 'POTANSİYEL GELECEK GELİR / AGENTIC ESTIMATE' : 'GERÇEKLEŞEN AYLIK GELİR HACMİ'}
                      </p>
                   </div>
                   <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${isPipeline ? 'bg-amber-500 shadow-amber-500/50' : 'bg-blue-500 shadow-blue-500/50'} shadow-glow animate-pulse`} />
                         <span className="text-[10px] font-black opacity-40 uppercase tracking-widest leading-none">
                           {isPipeline ? 'PREDICTIVE ENGINE ACTIVE' : 'LIVE SETTLEMENT DATA'}
                         </span>
                      </div>
                   </div>
                </div>

                <div className="flex-1 h-[320px] relative z-10 pr-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.salesTrend?.map((s: any) => ({ ay: s.month, Ciro: s.total })) || []}>
                      <defs>
                        <linearGradient id="hudBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isPipeline ? "#f59e0b" : "#3b82f6"} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={isPipeline ? "#f59e0b" : "#3b82f6"} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                      <XAxis dataKey="ay" stroke="rgba(255,255,255,0.2)" fontSize={9} axisLine={false} tickLine={false} dy={10} />
                      <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} axisLine={false} tickLine={false} tickFormatter={(v) => `₺${(v/1000).toFixed(0)}K`} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                        contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px' }}
                      />
                      <Bar dataKey="Ciro" fill="url(#hudBarGrad)" radius={[10, 10, 0, 0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </Card>
           </motion.div>
           
           <div className="lg:col-span-4 space-y-6">
              <AgingWidget />
              <AIPredictionsWidget stats={stats} loading={loading} />
           </div>
       </div>

       {/* Section 2: Operational Intelligence HUD */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Card variant="glass" className="h-[400px] border-white/5 p-8 relative overflow-hidden group">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
              <div className="flex items-center justify-between mb-8 relative z-10">
                 <div>
                    <h3 className="text-xl font-black text-foreground italic flex items-center gap-2">
                       <Activity className="w-5 h-5 text-primary" />
                       Üretim Döngüsü HUD
                    </h3>
                    <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] mt-1 pr-12 line-clamp-1 truncate">OPERASYONEL HACİM VE ANALİTİK VERİMLİLİK</p>
                 </div>
              </div>
              <div className="flex-1 h-[280px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="hudAreaPrim" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={9} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '24px', backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }} />
                    <Area 
                       type="monotone" 
                       dataKey="Emir" 
                       stroke="var(--primary)" 
                       strokeWidth={6} 
                       fill="url(#hudAreaPrim)" 
                       dot={{ r: 4, fill: '#000', stroke: 'var(--primary)', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </Card>

           <Card variant="glass" className="h-[400px] border-white/5 p-8 relative overflow-hidden group">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50" />
              <div className="mb-8 relative z-10">
                 <h3 className="text-xl font-black text-foreground italic flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                    İstasyon Verimlilik Matrisi
                 </h3>
                 <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em] mt-1">İSTASYON BAZLI İŞ GÜCÜ SEGMENTASYONU</p>
              </div>
              <div className="h-[280px] relative z-10">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats?.stationStats || []} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="station_name" type="category" stroke="rgba(255,255,255,0.5)" fontSize={11} width={120} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '24px', backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                      <Bar dataKey="count" name="Adet" fill="var(--primary)" radius={[0, 12, 12, 0]} barSize={20}>
                        {stats?.stationStats?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--primary)' : '#10b981'} />
                        ))}
                      </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </Card>
       </div>
    </div>
  )
}
