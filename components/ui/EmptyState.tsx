'use client'

import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'

interface EmptyStateProps {
  /** Başlık (örn. "Henüz kayıt yok") */
  title: string
  /** Açıklama metni */
  description?: string
  /** İkon (varsayılan: Inbox) */
  icon?: LucideIcon
  /** Opsiyonel aksiyon butonu */
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'group flex flex-col items-center justify-center gap-5 rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-md py-16 px-8 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:bg-slate-900/60 hover:border-slate-600/60',
        className
      )}
    >
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/80 ring-1 ring-slate-700/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-transform duration-500 group-hover:scale-110 group-hover:shadow-[0_0_40px_rgba(59,130,246,0.25)]">
        <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl" />
        <Icon className="relative h-10 w-10 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
      </div>
      <div className="space-y-2.5 max-w-md">
        <h3 className="text-lg font-bold tracking-tight text-white">{title}</h3>
        {description && <p className="text-[15px] font-medium text-slate-400 leading-relaxed">{description}</p>}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
