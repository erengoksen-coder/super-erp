'use client'

import React, { useEffect, useState } from 'react'
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ChevronRight, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardBody } from '@/components/ui/Card'
import { fetchApi } from '@/lib/api/client'

export function AIInsightsCard() {
  const [data, setData] = useState<{ insights: string[], stats: any } | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    async function loadInsights() {
      try {
        const res = await fetchApi<any>('/api/ai/insights')
        if (res.success) {
          setData(res.data)
        }
      } catch (err) {
        console.error('AI Insights load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadInsights()
  }, [])

  useEffect(() => {
    if (data?.insights.length && data.insights.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % data.insights.length)
      }, 5000)
      return () => clearInterval(timer)
    }
  }, [data])

  if (loading) {
    return (
      <Card variant="elevated" className="bg-slate-900/40 border-blue-500/20 animate-pulse">
        <CardBody className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/20" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-slate-700 rounded" />
            <div className="h-3 w-1/2 bg-slate-800 rounded" />
          </div>
        </CardBody>
      </Card>
    )
  }

  if (!data || data.insights.length === 0) return null

  const currentInsight = data.insights[currentIndex]

  return (
    <Card 
      variant="elevated" 
      className="bg-gradient-to-r from-blue-600/10 via-slate-900/40 to-indigo-600/10 border-blue-500/30 overflow-hidden relative group"
    >
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:24px_24px]" />
      <CardBody className="p-4 sm:p-6 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Furki AI Tavsiyesi</span>
              <div className="h-px flex-1 bg-gradient-to-r from-blue-500/30 to-transparent" />
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3"
              >
                {currentInsight.includes('⚠️') ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                ) : currentInsight.includes('✅') || currentInsight.includes('🚀') ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-blue-500 shrink-0" />
                )}
                <p className="text-sm sm:text-base font-bold text-slate-100 leading-snug">
                  {currentInsight}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Haftalık Kâr</span>
              <span className={data.stats.netProfit >= 0 ? "text-sm font-black text-emerald-400" : "text-sm font-black text-red-400"}>
                {data.stats.netProfit > 0 ? '+' : ''}{data.stats.netProfit.toLocaleString()} ₺
              </span>
            </div>
            <button className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-blue-600 hover:text-white transition-all group/btn">
              <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
        
        {/* Progress dots */}
        {data.insights.length > 1 && (
          <div className="flex gap-1.5 mt-4 sm:mt-2 sm:ml-[72px]">
            {data.insights.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-6 bg-blue-500' : 'w-2 bg-slate-700'}`}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
