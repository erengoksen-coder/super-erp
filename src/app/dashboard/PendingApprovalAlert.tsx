'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export function PendingApprovalAlert() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard/stats', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const n = data?.data?.pendingApprovalCount ?? data?.pendingApprovalCount
        if (!cancelled && typeof n === 'number') setCount(n)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (count == null || count <= 0) return null

  return (
    <Link
      href="/shipments?status=pending_approval"
      className="flex items-center gap-3 rounded-xl border border-blue-700/60 bg-blue-900/30 px-4 py-3 text-blue-200 hover:bg-blue-900/50 transition"
    >
      <ShieldCheck className="h-5 w-5 shrink-0 text-blue-400" />
      <span className="text-sm font-medium">
        <strong>{count}</strong> sevkiyat onay bekliyor. Onaylamak için tıklayın.
      </span>
    </Link>
  )
}
