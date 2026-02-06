'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PageLoaderProps {
  /** Sayfa ortasında tam ekran mı, yoksa inline mı */
  fullScreen?: boolean
  /** Alt metin (örn. "Yükleniyor...") */
  label?: string
  className?: string
}

export function PageLoader({ fullScreen = false, label = 'Yükleniyor...', className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-gray-400',
        fullScreen ? 'min-h-[280px] w-full' : 'py-8',
        className
      )}
      role="status"
      aria-label={label}
    >
      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}
