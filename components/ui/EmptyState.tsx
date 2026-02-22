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
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-gray-700/80 bg-gray-900/60 py-14 px-8 text-center shadow-inner',
        className
      )}
    >
      <div className="rounded-full bg-gray-800 p-5 ring-2 ring-gray-700/50">
        <Icon className="h-12 w-12 text-gray-400" />
      </div>
      <div className="space-y-2 max-w-md">
        <h3 className="text-base font-semibold text-gray-200">{title}</h3>
        {description && <p className="text-sm text-gray-500 leading-relaxed">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
