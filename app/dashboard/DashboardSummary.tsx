'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, AlertTriangle, Factory, TrendingUp, ExternalLink, ClipboardList } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { Card, CardBody } from '@/components/ui/Card'

type DashboardStats = {
  totalStockValue: number
  pendingProduction: number
  criticalStock: number
  bottleneck: { station: string; station_name: string; count: number; total_quantity: number } | null
  todayOrders?: number
  todayInvoices?: number
  todayShipments?: number
  pendingPurchaseRequests?: number
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
      sub: 'Hammadde (Mevcut)',
      icon: Package,
      href: '/inventory',
      color: 'text-blue-400',
      bgIcon: 'bg-blue-500/20 text-blue-400',
    },
    {
      label: 'Kritik Stok',
      value: stats.criticalStock,
      sub: 'hammadde uyarısı',
      icon: AlertTriangle,
      href: '/inventory',
      color: stats.criticalStock > 0 ? 'text-amber-400' : 'text-slate-400',
      bgIcon: stats.criticalStock > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400',
    },
    {
      label: 'Bekleyen Üretim',
      value: stats.pendingProduction,
      sub: 'aktif emir',
      icon: Factory,
      href: '/production',
      color: 'text-violet-400',
      bgIcon: 'bg-violet-500/20 text-violet-400',
    },
    {
      label: stats.bottleneck ? 'Darboğaz' : 'Durum',
      value: stats.bottleneck ? stats.bottleneck.station_name : 'Sorun Yok',
      sub: stats.bottleneck ? `${stats.bottleneck.count} birim` : 'üretim temiz',
      icon: TrendingUp,
      href: '/production',
      color: stats.bottleneck ? 'text-rose-400' : 'text-emerald-400',
      bgIcon: stats.bottleneck ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400',
    },
    {
      label: 'Satın Alma',
      value: stats.pendingPurchaseRequests ?? 0,
      sub: 'bekleyen talep',
      icon: ClipboardList,
      href: '/purchase-requests',
      color: (stats.pendingPurchaseRequests ?? 0) > 0 ? 'text-amber-400' : 'text-slate-400',
      bgIcon: (stats.pendingPurchaseRequests ?? 0) > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400',
    },
  ]

  const todayOrders = stats.todayOrders ?? 0
  const todayInvoices = stats.todayInvoices ?? 0
  const todayShipments = stats.todayShipments ?? 0
  const hasToday = todayOrders > 0 || todayInvoices > 0 || todayShipments > 0

  return (
    <div className="space-y-5">
      {hasToday && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-slate-500 font-medium">Bugünkü işlemler:</span>
          <Link href="/orders" className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition">
            <span className="font-semibold tabular-nums">{todayOrders}</span> sipariş
          </Link>
          <span className="text-slate-600">·</span>
          <Link href="/invoices" className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition">
            <span className="font-semibold tabular-nums">{todayInvoices}</span> fatura
          </Link>
          <span className="text-slate-600">·</span>
          <Link href="/shipments" className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition">
            <span className="font-semibold tabular-nums">{todayShipments}</span> sevkiyat
          </Link>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link key={c.label} href={c.href} className="block group">
              <Card variant="elevated" hover className="h-full bg-slate-800/40 backdrop-blur-xl border-slate-700/60 hover:border-slate-500/50 transition-all duration-300 shadow-xl overflow-hidden group/card relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${c.color.replace('text-', 'from-').replace('400', '500/10')} to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500`} />
                <CardBody className="p-5 relative z-10">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className={`shrink-0 rounded-2xl p-3 ${c.bgIcon} shadow-inner`}>
                        <Icon className="h-6 w-6" aria-hidden />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold tracking-wide text-slate-400 uppercase mb-1">{c.label}</h3>
                      <div className="flex items-baseline gap-2">
                        <p className={`text-2xl lg:text-3xl font-bold tabular-nums tracking-tight ${c.color} group-hover/card:text-white transition-colors`}>{c.value}</p>
                      </div>
                      <p className="mt-1.5 text-[13px] font-medium text-slate-500 group-hover/card:text-slate-300 transition-colors flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                        {c.sub}
                      </p>
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
