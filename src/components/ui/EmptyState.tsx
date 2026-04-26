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
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-gray-800 bg-gray-900/50 py-12 px-6 text-center',
        className
      )}
    >
      <div className="rounded-full bg-gray-800/80 p-4">
        <Icon className="h-10 w-10 text-gray-500" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-medium text-gray-300">{title}</h3>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
