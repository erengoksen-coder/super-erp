'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Zap, Info, AlertCircle } from 'lucide-react'
import useSWR from 'swr'
import { fetcher } from '@/lib/api/fetcher'
import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'

interface PulseEvent {
  id: string
  type: 'success' | 'info' | 'warning'
  text: string
  time: string
}

export function AgiPulse() {
  const { data: events = [], isLoading } = useSWR<PulseEvent[]>('/api/dashboard/pulse', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true
  })

  return (
    <Card variant="glass" className="border-white/5 overflow-hidden flex flex-col h-full group">
       <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
       <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Activity className="w-5 h-5 animate-pulse" />
             </div>
             <div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest leading-none">Agi-Pulse</h3>
                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest mt-1">Canlı Sistem Akışı</p>
             </div>
          </div>
          <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />
       </div>
       
       <div className="flex-1 overflow-hidden relative min-h-[400px]">
          <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950 to-transparent z-10 pointer-events-none" />
          
          <div className="p-4 space-y-4">
             <AnimatePresence mode="popLayout">
                {events
                  .filter(e => e && e.text && e.text !== 'null')
                  .map((event, idx) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: idx * 0.1 }}
                      className={cn(
                        "p-4 rounded-2xl border border-white/5 bg-white/[0.02] flex items-start gap-4 hover:bg-white/[0.05] transition-all cursor-pointer relative group/item",
                        event.type === 'success' && "border-emerald-500/20",
                        event.type === 'warning' && "border-amber-500/20"
                      )}
                   >
                      <div className={cn(
                         "mt-1 p-1.5 rounded-lg shrink-0",
                         event.type === 'success' && "bg-emerald-500/10 text-emerald-500",
                         event.type === 'info' && "bg-blue-500/10 text-blue-500",
                         event.type === 'warning' && "bg-amber-500/10 text-amber-500"
                      )}>
                         {event.type === 'success' && <Zap className="w-3 h-3" />}
                         {event.type === 'info' && <Info className="w-3 h-3" />}
                         {event.type === 'warning' && <AlertCircle className="w-3 h-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                         <p className="text-xs font-bold text-foreground/80 leading-snug">{event.text}</p>
                         <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest mt-1">{event.time}</p>
                      </div>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                         <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow shadow-primary/50" />
                      </div>
                   </motion.div>
                ))}
             </AnimatePresence>
          </div>
       </div>
    </Card>
  )
}
