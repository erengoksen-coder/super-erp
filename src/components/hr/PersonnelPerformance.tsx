'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, 
  Clock, 
  Target, 
  TrendingUp, 
  Award, 
  AlertCircle,
  CheckCircle2,
  BarChart2
} from 'lucide-react'
import { ZenithCard } from '@/components/ui/ZenithCard'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

interface PersonnelPerformanceProps {
  employees: any[]
  operations: any[]
}

export const PersonnelPerformance: React.FC<PersonnelPerformanceProps> = ({ employees = [], operations = [] }) => {
  const employeePerformance = useMemo(() => {
    return employees.map(emp => {
      const empOps = operations.filter(op => op.personnel_id === emp.id && op.status === 'completed')
      
      let totalPlanned = 0
      let totalActual = 0
      let onTimeCount = 0

      empOps.forEach(op => {
        totalPlanned += op.planned_duration_minutes || 0
        totalActual += op.actual_duration_minutes || 0
        if ((op.actual_duration_minutes || 0) <= (op.planned_duration_minutes || 0)) {
          onTimeCount++
        }
      })

      const efficiency = totalActual > 0 ? Math.min(100, (totalPlanned / totalActual) * 100) : 0
      const onTimeRate = empOps.length > 0 ? (onTimeCount / empOps.length) * 100 : 0

      return {
        ...emp,
        efficiency,
        onTimeRate,
        completedOps: empOps.length
      }
    }).sort((a, b) => b.efficiency - a.efficiency)
  }, [employees, operations])

  return (
    <div className="space-y-8 animate-reveal">
      {/* Top Performers Spotlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {employeePerformance.slice(0, 3).map((emp, i) => (
          <ZenithCard key={emp.id} glow className={cn(
            "relative overflow-hidden",
            i === 0 ? "bg-primary/10 border-primary/30" : "bg-white/[0.03] border-white/10"
          )}>
            {i === 0 && (
              <div className="absolute top-0 right-0 p-4">
                 <Award className="w-8 h-8 text-primary shadow-glow animate-pulse" />
              </div>
            )}
            <div className="flex items-center gap-4 mb-6">
               <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-lg font-black text-white">
                  {emp.first_name?.[0]}{emp.last_name?.[0]}
               </div>
               <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">{i === 0 ? 'ŞAMPİYON' : 'ÜST SEGMENT'}</p>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">{emp.first_name} {emp.last_name}</h4>
               </div>
            </div>
            <div className="space-y-4">
               <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">VERİMLİLİK</span>
                  <span className="text-xl font-black text-white">%{Math.round(emp.efficiency)}</span>
               </div>
               <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${emp.efficiency}%` }}
                    className={cn("h-full shadow-glow", i === 0 ? "bg-primary" : "bg-white/40")}
                  />
               </div>
            </div>
          </ZenithCard>
        ))}
      </div>

      {/* Detailed Performance Table */}
      <ZenithCard className="p-0 overflow-hidden bg-black/40 border-white/5">
         <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
               <BarChart2 className="w-4 h-4 text-primary" />
               OPERASYONEL VERİMLİLİK MATRİSİ
            </h3>
            <Badge variant="glass" className="text-[9px] font-black tracking-widest">SON 30 GÜN</Badge>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                     <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest">PERSONEL</th>
                     <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-center">TAMAMLANAN</th>
                     <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-center">ZAMANINDA</th>
                     <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-center">VERİMLİLİK</th>
                     <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-right">DURUM</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {employeePerformance.map((emp) => (
                     <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white/40 group-hover:text-primary group-hover:border-primary/30 transition-all">
                                 {emp.first_name?.[0]}
                              </div>
                              <div>
                                 <p className="text-[11px] font-black text-white uppercase tracking-tight">{emp.first_name} {emp.last_name}</p>
                                 <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{emp.department}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className="text-[11px] font-black text-white/60">{emp.completedOps}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <div className="flex items-center justify-center gap-2">
                              <span className={cn(
                                "text-[11px] font-black",
                                emp.onTimeRate >= 90 ? "text-emerald-500" : emp.onTimeRate >= 70 ? "text-amber-500" : "text-error"
                              )}>
                                %{Math.round(emp.onTimeRate)}
                              </span>
                              {emp.onTimeRate >= 90 ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col items-center gap-1.5">
                              <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                 <div 
                                    className={cn("h-full", emp.efficiency >= 85 ? "bg-primary" : "bg-white/20")}
                                    style={{ width: `${emp.efficiency}%` }}
                                 />
                              </div>
                              <span className="text-[10px] font-black text-white/40">%{Math.round(emp.efficiency)}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <Badge 
                             variant="soft" 
                             color={emp.efficiency >= 90 ? 'success' : emp.efficiency >= 70 ? 'warning' : 'danger'}
                             className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest"
                           >
                             {emp.efficiency >= 90 ? 'EFSANE' : emp.efficiency >= 70 ? 'STABİL' : 'KRİTİK'}
                           </Badge>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </ZenithCard>
    </div>
  )
}
