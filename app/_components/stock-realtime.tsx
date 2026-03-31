'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { REALTIME_POLL_INTERVAL_MS } from '@/lib/realtime-config'

type StockRealtimeProps = {
  onUpdate: () => void
  /** Polling aralığı (ms). 0 ise sadece Supabase. Varsayılan: merkezi config */
  pollIntervalMs?: number
}

export default function StockRealtime({ onUpdate, pollIntervalMs = REALTIME_POLL_INTERVAL_MS }: StockRealtimeProps) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel('stock_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
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
    const onVisible = () => { onUpdateRef.current() }
    const interval = setInterval(tick, pollIntervalMs)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pollIntervalMs])

  return null
}
