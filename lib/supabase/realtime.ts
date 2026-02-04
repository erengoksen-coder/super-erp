import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type RealtimeHandler = () => void

export function subscribeToTable(table: string, onChange: RealtimeHandler) {
  const client = createClient()
  if (!client) {
    return null
  }

  const channel: RealtimeChannel = client
    .channel(`realtime:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
      onChange()
    })
    .subscribe()

  return () => {
    client.removeChannel(channel)
  }
}
