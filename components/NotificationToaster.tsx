'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast as sonnerToast } from 'sonner'
import { fetchApi } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import { usePreferencesStore } from '@/lib/store/preferencesStore'
import { playNotificationSound } from '@/lib/notify-sound'

const POLL_INTERVAL_MS = 12_000

type NotifItem = { id: string; title: string; message: string; reference_type?: string | null; reference_id?: string | null }

function getNotificationHref(refType: string | null | undefined, refId: string | null | undefined): string | null {
  if (!refType) return null
  switch (refType) {
    case 'purchase_request':
      return refId ? `/purchase-requests?highlight=${encodeURIComponent(refId)}` : '/purchase-requests'
    case 'shipment':
      return refId ? `/shipments/${refId}` : '/shipments'
    case 'bayi_order':
      return '/orders'
    default:
      return null
  }
}

export default function NotificationToaster() {
  const router = useRouter()
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const notificationSound = usePreferencesStore((s) => s.notificationSound)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const initialLoadRef = useRef(true)

  useEffect(() => {
    if (!userId) return

    const poll = async () => {
      try {
        const list = await fetchApi<NotifItem[]>('/api/notifications')
        if (!Array.isArray(list)) return

        for (const n of list) {
          if (seenIdsRef.current.has(n.id)) continue
          seenIdsRef.current.add(n.id)
          if (initialLoadRef.current) continue
          const href = getNotificationHref(n.reference_type, n.reference_id)
          if (href) {
            sonnerToast.info(n.title, {
              description: n.message,
              action: {
                label: 'Görüntüle',
                onClick: () => router.push(href),
              },
            })
          } else {
            sonnerToast.info(n.title, { description: n.message })
          }
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
  }, [userId, notificationSound, router])

  return null
}
