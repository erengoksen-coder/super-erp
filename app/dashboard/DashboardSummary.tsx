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
      <CardBody className="p-4">
        <div className="animate-pulse flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-gray-700 rounded" />
            <div className="h-8 w-16 bg-gray-600 rounded" />
          </div>
          <div className="h-10 w-10 bg-gray-700 rounded-full" />
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
    },
    {
      label: 'Kritik Stok',
      value: stats.criticalStock,
      sub: 'uyarı',
      icon: AlertTriangle,
      href: '/inventory',
      color: stats.criticalStock > 0 ? 'text-amber-400' : 'text-gray-400',
    },
    {
      label: 'Bekleyen Üretim',
      value: stats.pendingProduction,
      sub: 'emir',
      icon: Factory,
      href: '/production',
      color: 'text-violet-400',
    },
    {
      label: stats.bottleneck ? 'Darboğaz' : 'Durum',
      value: stats.bottleneck ? stats.bottleneck.station_name : '—',
      sub: stats.bottleneck ? `${stats.bottleneck.count} birim` : 'yok',
      icon: TrendingUp,
      href: '/production',
      color: 'text-emerald-400',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          const content = (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-400">{c.label}</p>
                  <p className={`text-lg md:text-2xl font-semibold ${c.color}`}>{c.value}</p>
                  <p className="text-[10px] md:text-xs text-gray-500">{c.sub}</p>
                </div>
                <Icon className="h-8 w-8 text-gray-600 hidden sm:block" />
              </div>
            </>
          )
          return (
            <Link key={c.label} href={c.href}>
              <Card variant="flat" hover className="h-full transition-opacity hover:opacity-90">
                <CardBody className="p-4">{content}</CardBody>
              </Card>
            </Link>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors"
        >
          <Package className="h-4 w-4" />
          Stok
          <ExternalLink className="h-3 w-3 opacity-70" />
        </Link>
        <Link
          href="/production"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors"
        >
          <Factory className="h-4 w-4" />
          Üretim
          <ExternalLink className="h-3 w-3 opacity-70" />
        </Link>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors"
        >
          <TrendingUp className="h-4 w-4" />
          Siparişler
          <ExternalLink className="h-3 w-3 opacity-70" />
        </Link>
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors"
        >
          Cari Hesaplar
          <ExternalLink className="h-3 w-3 opacity-70" />
        </Link>
      </div>
    </div>
  )
}
