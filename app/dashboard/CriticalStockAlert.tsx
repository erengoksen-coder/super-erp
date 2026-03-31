'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Bell } from 'lucide-react'

export function CriticalStockAlert() {
  const [criticalCount, setCriticalCount] = useState<number | null>(null)
  const [openAlertsCount, setOpenAlertsCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard/stats', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.data?.criticalStock != null) setCriticalCount(data.data.criticalStock)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/stock-alerts?status=open', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setOpenAlertsCount(data.length)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const hasCritical = criticalCount != null && criticalCount > 0
  const hasOpenAlerts = openAlertsCount != null && openAlertsCount > 0
  if (!hasCritical && !hasOpenAlerts) return null

  return (
    <div className="space-y-2">
      {hasCritical && (
        <Link
          href="/purchase/critical-stock"
          className="flex items-center gap-3 rounded-xl border border-amber-700/60 bg-amber-900/30 px-4 py-3 text-amber-200 hover:bg-amber-900/50 transition"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
          <span className="text-sm font-medium">
            <strong>{criticalCount}</strong> hammadde kritik stok seviyesinde. Listeyi görüntülemek için tıklayın.
          </span>
        </Link>
      )}
      {hasOpenAlerts && (
        <Link
          href="/notifications"
          className="flex items-center gap-3 rounded-xl border border-orange-700/60 bg-orange-900/30 px-4 py-3 text-orange-200 hover:bg-orange-900/50 transition"
        >
          <Bell className="h-5 w-5 shrink-0 text-orange-400" />
          <span className="text-sm font-medium">
            <strong>{openAlertsCount}</strong> açık stok uyarısı. Bildirimler sayfasından inceleyebilirsiniz.
          </span>
        </Link>
      )}
    </div>
  )
}
