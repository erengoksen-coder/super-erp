'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSeenFeaturesStore } from '@/lib/store/seenFeaturesStore'
import { cn } from '@/lib/cn'

type Props = {
  featureId: string
  children: React.ReactNode
  className?: string
}

/**
 * Yenilikleri tek seferlik kırmızı vurgu ile gösterir.
 * Kullanıcı "Gördüm" deyince veya içeriğe tıklayınca normale döner.
 * Hydration: mount olana kadar her zaman wrapper render edilir (SSR/client aynı HTML).
 */
export function NewFeatureHighlight({
  featureId,
  children,
  className,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const isSeen = useSeenFeaturesStore((s) => s.isSeen(featureId))
  const markSeen = useSeenFeaturesStore((s) => s.markSeen)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMarkSeen = useCallback(() => {
    markSeen(featureId)
  }, [featureId, markSeen])

  const wrapper = (
    <div
      className={cn(
        'relative rounded-xl ring-2 ring-red-500/90 ring-offset-2 ring-offset-slate-900 bg-red-950/20 transition-all',
        className
      )}
    >
      <span
        className="absolute -top-1 -right-1 z-10 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white shadow"
        aria-hidden
      >
        Yeni
      </span>
      <div className="pt-5 pr-4">
        {children}
      </div>
      <div className="flex justify-end px-4 pb-3 pt-1">
        <button
          type="button"
          onClick={handleMarkSeen}
          className="text-xs font-medium text-red-300 hover:text-red-200 underline"
        >
          Gördüm, normale dön
        </button>
      </div>
    </div>
  )

  // Hydration: mount olana kadar her zaman wrapper (SSR ile client ilk render aynı)
  if (!mounted) {
    return children == null ? null : wrapper
  }
  if (isSeen || children == null) {
    return <>{children}</>
  }
  return wrapper
}
