'use client'

import React, { useState, useEffect } from 'react'
import { 
  Cpu, Zap, AlertCircle, ShoppingCart, 
  ArrowRight, ShieldCheck, X, Sparkles,
  Command, Settings2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { fetchApi } from '@/lib/api/client'
import Link from 'next/link'

interface Suggestion {
  id: string
  type: 'alert' | 'info' | 'success'
  title: string
  message: string
  actionLabel: string
  actionHref: string
  icon: any
}

export function AgiOperator() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  // Real-time Intelligence Analysis Simulation
  useEffect(() => {
    const checkSystem = async () => {
      try {
        const stats = await fetchApi<any>('/api/dashboard/stats')
        const newSuggestions: Suggestion[] = []

        if (stats.criticalStock > 0) {
          newSuggestions.push({
            id: 'stock',
            type: 'alert',
            title: 'KRİTİK STOK TESPİT EDİLDİ',
            message: `${stats.criticalStock} hammadde kritik seviyenin altında. Tedarik zinciri kesintisi riski!`,
            actionLabel: 'Sipariş Oluştur',
            actionHref: '/purchase-requests/new',
            icon: ShoppingCart
          })
        }

        if (stats.bottleneck) {
          newSuggestions.push({
            id: 'prod',
            type: 'info',
            title: 'ÜRETİM DARBOĞAZI ANALİZİ',
            message: `${stats.bottleneck.station_name} istasyonunda yığılma var. Kapasite artırımı önerilir.`,
            actionLabel: 'Hattı İncele',
            actionHref: '/production',
            icon: Zap
          })
        }

        if (newSuggestions.length > 0) {
          setSuggestions(newSuggestions)
          setIsVisible(true)
        }
      } catch (e) {
        console.error('AgiOperator intelligence failed:', e)
      }
    }

    const timeout = setTimeout(checkSystem, 3000)
    return () => clearTimeout(timeout)
  }, [])

  if (!isVisible || suggestions.length === 0) return null

  const current = suggestions[activeIdx]

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.8 }}
        className="fixed bottom-8 right-8 z-[100] w-full max-w-sm"
      >
        <div className="relative group overflow-hidden bg-slate-950/80 border border-primary/40 rounded-3xl p-6 glass shadow-[0_0_50px_rgba(var(--primary-rgb),0.2)]">
          {/* Animated Glow Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 blur-[60px] animate-pulse" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary shadow-glow shadow-primary/30">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black tracking-widest text-primary uppercase">AGI-OPERATOR</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase">PROAKTİF ZEKA AKTİF</span>
              </div>
            </div>
            <button 
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-white/10 rounded-full text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0",
                current.type === 'alert' ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : "bg-sky-500/20 text-sky-400 border-sky-500/30"
              )}>
                <current.icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white leading-tight uppercase tracking-wide">{current.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{current.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Link href={current.actionHref} className="flex-1">
                <Button 
                  variant="solid" 
                  size="sm" 
                  className="w-full h-9 text-xs font-bold gap-2 shadow-glow shadow-primary/20 group/btn"
                >
                  {current.actionLabel}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                </Button>
              </Link>
              {suggestions.length > 1 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9 px-3 glass"
                  onClick={() => setActiveIdx((activeIdx + 1) % suggestions.length)}
                >
                  <RefreshCwIcon className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Systems Indicator */}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 font-bold">CORE_SYNC</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] text-slate-500 font-bold">ZENITH_API</span>
              </div>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-primary opacity-50" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function RefreshCwIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}
