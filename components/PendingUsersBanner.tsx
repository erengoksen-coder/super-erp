'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import { Users, X } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'

function isAdmin(role: string | undefined | null): boolean {
  const r = (role ?? '').toString().trim().toLowerCase()
  return r === 'admin' || r === 'yönetici' || r === 'yonetici'
}

export default function PendingUsersBanner() {
  const user = useAuthStore((s) => s.user)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!user || !isAdmin(user.role)) return
    let cancelled = false
    fetch('/api/users/pending-count', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data) => {
        if (!cancelled && typeof data?.count === 'number') setPendingCount(data.count)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user])

  if (!user || !isAdmin(user.role) || pendingCount <= 0 || dismissed) return null

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 shrink-0 text-amber-400" />
        <span>
          <strong>Onay bekleyen kullanıcı var.</strong> {pendingCount} kullanıcı onayınızı bekliyor.
        </span>
        <Link
          href={ROUTES.USERS}
          className="shrink-0 rounded-lg bg-amber-500/30 px-3 py-1.5 text-sm font-medium text-amber-100 hover:bg-amber-500/50"
        >
          Kullanıcıları yönet
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-1 text-amber-300 hover:bg-amber-500/20 hover:text-amber-100"
        aria-label="Kapat"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}
