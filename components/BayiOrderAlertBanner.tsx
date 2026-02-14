'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchApi } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import { Package } from 'lucide-react'

type Notif = { id: string; title: string; message: string; type?: string; read?: number }

const POLL_MS = 12_000

function shouldShowBanner(role: string | undefined, position: string | undefined): boolean {
  const r = (role ?? '').toString().trim().toLowerCase()
  const p = (position ?? '').toString().trim().toLowerCase()
  if (r === 'bayi') return false
  if (r === 'admin' || r === 'yönetici' || r === 'yonetici') return true
  if (p === 'planlama') return true
  return false
}

export default function BayiOrderAlertBanner() {
  const user = useAuthStore((s) => s.user)
  const [alerts, setAlerts] = useState<Notif[]>([])

  const fetchUnread = useCallback(async () => {
    if (!user?.id) return
    try {
      const list = await fetchApi<Notif[]>('/api/notifications')
      if (!Array.isArray(list)) return
      const unread = list.filter((n) => n.type === 'bayi_order' && (n.read === 0 || !n.read))
      setAlerts(unread)
    } catch {
      // ignore
    }
  }, [user?.id])

  useEffect(() => {
    if (!user || !shouldShowBanner(user.role ?? undefined, user.position ?? undefined)) return
    fetchUnread()
    const t = setInterval(fetchUnread, POLL_MS)
    return () => clearInterval(t)
  }, [user?.id, user?.role, user?.position, fetchUnread])

  const handleTamam = async (id: string) => {
    try {
      await fetchApi(`/api/notifications/${id}/read`, { method: 'PATCH' })
    } catch {
      // still remove from list
    }
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  const visible = alerts
  if (!user || !shouldShowBanner(user.role ?? undefined, user.position ?? undefined) || visible.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      {visible.map((n) => (
        <div
          key={n.id}
          className="flex items-center gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-amber-100 shadow-lg"
        >
          <Package className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-amber-100">{n.title}</p>
            <p className="text-sm text-amber-200/90 mt-0.5">{n.message}</p>
          </div>
          <button
            type="button"
            onClick={() => handleTamam(n.id)}
            className="flex-shrink-0 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition"
          >
            Tamam
          </button>
        </div>
      ))}
    </div>
  )
}
