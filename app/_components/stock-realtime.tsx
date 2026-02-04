'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type StockRealtimeProps = {
  onUpdate: () => void
}

export default function StockRealtime({ onUpdate }: StockRealtimeProps) {
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel('stock_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'inventory' },
        () => {
          onUpdate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onUpdate])

  return null
}
