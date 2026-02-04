'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type ProductionRealtimeProps = {
  onUpdate: () => void
}

export default function ProductionRealtime({ onUpdate }: ProductionRealtimeProps) {
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel('production_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'production_orders' },
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
