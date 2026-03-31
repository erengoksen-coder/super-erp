import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRealtime(table: string, callback: (payload: any) => void) {
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel(table)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, callback])
}
