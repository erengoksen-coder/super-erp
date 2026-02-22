'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock } from 'lucide-react'

export function OverdueOrdersAlert() {
  const [overdue, setOverdue] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard/stats', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const n = data?.data?.overdueOrders ?? data?.overdueOrders
        if (!cancelled && typeof n === 'number') setOverdue(n)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (overdue == null || overdue <= 0) return null

  return (
    <Link
      href="/orders?overdue=1"
      className="flex items-center gap-3 rounded-xl border border-amber-700/60 bg-amber-900/30 px-4 py-3 text-amber-200 hover:bg-amber-900/50 transition"
    >
      <CalendarClock className="h-5 w-5 shrink-0 text-amber-400" />
      <span className="text-sm font-medium">
        <strong>{overdue}</strong> siparişin vadesi geçmiş. Görüntülemek için tıklayın.
      </span>
    </Link>
  )
}
