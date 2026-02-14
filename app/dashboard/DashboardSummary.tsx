'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, AlertTriangle, Factory, TrendingUp, ExternalLink } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { Card, CardBody } from '@/components/ui/Card'

type DashboardStats = {
  totalStockValue: number
  pendingProduction: number
  criticalStock: number
  bottleneck: { station: string; station_name: string; count: number; total_quantity: number } | null
}

function SkeletonCard() {
  return (
    <Card variant="flat" className="overflow-hidden">
      <CardBody className="p-5">
        <div className="animate-pulse flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className="h-3 w-20 bg-slate-600 rounded" />
            <div className="h-7 w-24 bg-slate-600 rounded" />
            <div className="h-3 w-14 bg-slate-700 rounded" />
          </div>
          <div className="h-10 w-10 bg-slate-600 rounded-xl shrink-0" />
        </div>
      </CardBody>
    </Card>
  )
}

export function DashboardSummary() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await fetchApi<DashboardStats>('/api/dashboard/stats')
        if (!cancelled) setStats(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Veri yüklenemedi')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
        Özet yüklenemedi: {error}
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    {
      label: 'Stok Değeri',
      value: stats.totalStockValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }),
      sub: 'Hammadde',
      icon: Package,
      href: '/inventory',
      color: 'text-blue-400',
      bgIcon: 'bg-blue-500/10 text-blue-400',
    },
    {
      label: 'Kritik Stok',
      value: stats.criticalStock,
      sub: 'uyarı',
      icon: AlertTriangle,
      href: '/inventory',
      color: stats.criticalStock > 0 ? 'text-amber-400' : 'text-slate-400',
      bgIcon: stats.criticalStock > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400',
    },
    {
      label: 'Bekleyen Üretim',
      value: stats.pendingProduction,
      sub: 'emir',
      icon: Factory,
      href: '/production',
      color: 'text-violet-400',
      bgIcon: 'bg-violet-500/10 text-violet-400',
    },
    {
      label: stats.bottleneck ? 'Darboğaz' : 'Durum',
      value: stats.bottleneck ? stats.bottleneck.station_name : '—',
      sub: stats.bottleneck ? `${stats.bottleneck.count} birim` : 'yok',
      icon: TrendingUp,
      href: '/production',
      color: 'text-emerald-400',
      bgIcon: 'bg-emerald-500/10 text-emerald-400',
    },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link key={c.label} href={c.href} className="block group">
              <Card variant="elevated" hover className="h-full transition-all duration-200 group-hover:border-slate-500/50">
                <CardBody className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{c.label}</p>
                      <p className={`mt-1 text-xl md:text-2xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{c.sub}</p>
                    </div>
                    <div className={`shrink-0 rounded-xl p-2.5 ${c.bgIcon}`}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 text-slate-300 text-sm font-medium hover:bg-slate-700/80 hover:text-white transition-colors border border-slate-700/50"
        >
          <Package className="h-4 w-4" />
          Stok
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Link>
        <Link
          href="/production"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 text-slate-300 text-sm font-medium hover:bg-slate-700/80 hover:text-white transition-colors border border-slate-700/50"
        >
          <Factory className="h-4 w-4" />
          Üretim
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Link>
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 text-slate-300 text-sm font-medium hover:bg-slate-700/80 hover:text-white transition-colors border border-slate-700/50"
        >
          <TrendingUp className="h-4 w-4" />
          Siparişler
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Link>
        <Link
          href="/accounts"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 text-slate-300 text-sm font-medium hover:bg-slate-700/80 hover:text-white transition-colors border border-slate-700/50"
        >
          Cari Hesaplar
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </Link>
      </div>
    </div>
  )
}
