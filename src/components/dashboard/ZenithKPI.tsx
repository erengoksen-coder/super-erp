'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ZenithKPIProps {
  title: string
  value: string | number
  trend?: string
  trendType?: 'up' | 'down' | 'neutral'
  icon: LucideIcon
  color?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'violet'
  description?: string
  loading?: boolean
}

const colorStyles = {
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-blue-500/10',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10',
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-amber-500/10',
  rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-rose-500/10',
  indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/10',
  violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20 shadow-violet-500/10',
}

export function ZenithKPI({
  title,
  value,
  trend,
  trendType = 'neutral',
  icon: Icon,
  color = 'blue',
  description,
  loading = false
}: ZenithKPIProps) {
  if (loading) {
    return (
      <div className="h-32 bg-slate-900/50 rounded-2xl animate-pulse border border-slate-800" />
    )
  }

  return (
    <div className={cn(
      "relative group overflow-hidden bg-[#0a0a0a]/80 glass border border-slate-800/50 rounded-2xl p-5 hover:border-slate-700/50 transition-all duration-300",
      "hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]"
    )}>
      {/* Background Glow */}
      <div className={cn(
        "absolute -right-4 -top-4 w-24 h-24 blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity",
        color === 'blue' && "bg-blue-500",
        color === 'emerald' && "bg-emerald-500",
        color === 'amber' && "bg-amber-500",
        color === 'rose' && "bg-rose-500",
        color === 'indigo' && "bg-indigo-500",
        color === 'violet' && "bg-violet-500",
      )} />

      <div className="relative flex flex-col h-full gap-3">
        <div className="flex items-center justify-between">
          <div className={cn(
            "p-2.5 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 duration-500 shadow-lg",
            colorStyles[color]
          )}>
            <Icon className="w-5 h-5" />
          </div>
          {trend && (
            <div className={cn(
              "px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1",
              trendType === 'up' && "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
              trendType === 'down' && "text-rose-400 bg-rose-500/10 border-rose-500/20",
              trendType === 'neutral' && "text-slate-400 bg-slate-500/10 border-slate-500/20"
            )}>
              {trendType === 'up' && '▲'}
              {trendType === 'down' && '▼'}
              {trend}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-white tracking-tighter group-hover:text-primary transition-colors">{value}</h3>
          </div>
          {description && (
            <p className="text-[11px] text-slate-500 leading-tight line-clamp-1">{description}</p>
          )}
        </div>
      </div>
      
      {/* Interactive Bottom Accent */}
      <div className={cn(
        "absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-700",
        color === 'blue' && "bg-blue-500",
        color === 'emerald' && "bg-emerald-500",
        color === 'amber' && "bg-amber-500",
        color === 'rose' && "bg-rose-500",
        color === 'indigo' && "bg-indigo-500",
        color === 'violet' && "bg-violet-500",
      )} />
    </div>
  )
}
