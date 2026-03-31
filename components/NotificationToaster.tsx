'use client'

import { useEffect, useRef } from 'react'
import { fetchApi } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import { usePreferencesStore } from '@/lib/store/preferencesStore'
import { toast } from '@/lib/notify'
import { playNotificationSound } from '@/lib/notify-sound'

const POLL_INTERVAL_MS = 25_000

export default function NotificationToaster() {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const notificationSound = usePreferencesStore((s) => s.notificationSound)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const initialLoadRef = useRef(true)

  useEffect(() => {
    if (!userId) return

    const poll = async () => {
      try {
        const list = await fetchApi<Array<{ id: string; title: string; message: string; read?: number }>>('/api/notifications')
        if (!Array.isArray(list)) return

        for (const n of list) {
          if (seenIdsRef.current.has(n.id)) continue
          seenIdsRef.current.add(n.id)
          if (initialLoadRef.current) continue
          toast.info(n.title, n.message)
          if (notificationSound) playNotificationSound()
        }
        initialLoadRef.current = false
      } catch {
        // ignore
      }
    }

    const t = window.setInterval(poll, POLL_INTERVAL_MS)
    poll()
    return () => clearInterval(t)
  }, [userId, notificationSound])

  return null
}
