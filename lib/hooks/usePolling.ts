'use client'

import { useEffect, useRef } from 'react'
import { REALTIME_POLL_INTERVAL_MS } from '@/lib/realtime-config'

/**
 * Sekme görünürken periyodik yenileme; görünmezken durur.
 * Sekme tekrar görününce hemen bir refetch yapılır (en verimli davranış).
 */
export function usePolling(
  refetch: () => void | Promise<void>,
  intervalMs: number = REALTIME_POLL_INTERVAL_MS,
  enabled: boolean = true
) {
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refetchRef.current()
      }
    }

    const onVisible = () => {
      refetchRef.current()
    }

    const interval = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs, enabled])
}
