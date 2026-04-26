'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, AlertTriangle, Factory, TrendingUp, ExternalLink, ClipboardList, ShoppingCart, FileText, Truck } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { ZenithKPI } from '@/components/dashboard/ZenithKPI'

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

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-800/30 bg-rose-950/20 px-6 py-4 text-sm text-rose-400 glass animate-in fade-in">
        Denetim Özeti Yüklenemedi: {error}
      </div>
    )
  }

  const todayOrders = stats?.todayOrders ?? 0
  const todayInvoices = stats?.todayInvoices ?? 0
  const todayShipments = stats?.todayShipments ?? 0
  const hasToday = todayOrders > 0 || todayInvoices > 0 || todayShipments > 0

  return (
    <div className="space-y-8">
      {/* Dynamic Activity Strip */}
      {hasToday && (
        <div className="flex flex-wrap items-center gap-6 px-4 py-2 bg-primary/5 border border-primary/20 rounded-2xl glass">
          <span className="text-[10px] uppercase tracking-widest text-primary font-black">CANLI AKIŞ:</span>
          <Link href="/orders" className="group flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-all">
            <ShoppingCart className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary" />
            <span className="font-bold text-slate-200">{todayOrders}</span> Sipariş
          </Link>
          <div className="w-1 h-1 rounded-full bg-slate-800" />
          <Link href="/invoices" className="group flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-all">
            <FileText className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary" />
            <span className="font-bold text-slate-200">{todayInvoices}</span> Fatura
          </Link>
          <div className="w-1 h-1 rounded-full bg-slate-800" />
          <Link href="/shipments" className="group flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-all">
            <Truck className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary" />
            <span className="font-bold text-slate-200">{todayShipments}</span> Sevkiyat
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
        <Link href="/inventory" className="block">
          <ZenithKPI 
            title="STOK DEĞERİ"
            value={stats ? stats.totalStockValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }) : '...'}
            icon={Package}
            color="blue"
            description="Mevcut Hammadde & Ürün"
            loading={loading}
          />
        </Link>

        <Link href="/inventory" className="block">
          <ZenithKPI 
            title="KRİTİK STOK"
            value={stats?.criticalStock || 0}
            icon={AlertTriangle}
            color={stats?.criticalStock && stats.criticalStock > 0 ? 'amber' : 'emerald'}
            description="Acil Tedarik Gereksinimi"
            trend={stats?.criticalStock && stats.criticalStock > 0 ? `+${stats.criticalStock}` : 'OK'}
            trendType={stats?.criticalStock && stats.criticalStock > 0 ? 'down' : 'up'}
            loading={loading}
          />
        </Link>

        <Link href="/production" className="block">
          <ZenithKPI 
            title="BEKLEYEN ÜRETİM"
            value={stats?.pendingProduction || 0}
            icon={Factory}
            color="violet"
            description="Aktif İş Emri Hattı"
            loading={loading}
          />
        </Link>

        <Link href="/production" className="block">
          <ZenithKPI 
            title="FABRİKA DARBOĞAZ"
            value={stats?.bottleneck ? stats.bottleneck.station_name : 'Sorun Yok'}
            icon={TrendingUp}
            color={stats?.bottleneck ? 'rose' : 'emerald'}
            description={stats?.bottleneck ? `${stats.bottleneck.count} Birim Bekliyor` : 'Hattat Akışı Temiz'}
            loading={loading}
          />
        </Link>

        <Link href="/purchase-requests" className="block">
          <ZenithKPI 
            title="SATIN ALMA"
            value={stats?.pendingPurchaseRequests || 0}
            icon={ClipboardList}
            color="indigo"
            description="Bekleyen Malzeme Talebi"
            loading={loading}
          />
        </Link>
      </div>

      {/* Quick Navigation Cards */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Envanter', href: '/inventory', icon: Package },
          { label: 'Üretim', href: '/production', icon: Factory },
          { label: 'Siparişler', href: '/orders', icon: TrendingUp },
          { label: 'Cari Hesaplar', href: '/accounts', icon: Wallet },
        ].map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="group flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 glass"
          >
            <link.icon className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
            <span className="text-xs font-bold text-slate-300 group-hover:text-white">{link.label}</span>
            <ExternalLink className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  )
}

function Wallet({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  )
}
