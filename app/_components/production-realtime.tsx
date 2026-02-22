'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { REALTIME_POLL_INTERVAL_MS } from '@/lib/realtime-config'

type ProductionRealtimeProps = {
  onUpdate: () => void
  /** Polling aralığı (ms). 0 ise sadece Supabase. Varsayılan: merkezi config */
  pollIntervalMs?: number
}

export default function ProductionRealtime({ onUpdate, pollIntervalMs = REALTIME_POLL_INTERVAL_MS }: ProductionRealtimeProps) {
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel('production_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'production_orders' },
        () => { onUpdateRef.current() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (pollIntervalMs <= 0) return
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        onUpdateRef.current()
      }
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      setTimeout(() => onUpdateRef.current(), 0)
    }
    const interval = setInterval(tick, pollIntervalMs)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pollIntervalMs])

  return null
}
