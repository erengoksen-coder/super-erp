'use client'

import { cn } from '@/lib/cn'

interface LoadingStateProps {
  /** Kısa açıklama (varsayılan: "Yükleniyor...") */
  message?: string
  className?: string
}

export function LoadingState({ message = 'Yükleniyor...', className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12 text-center',
        className
      )}
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}
