'use client'

import { useState, useEffect } from 'react'
import { Package, Truck, Wallet, User, ChevronRight, Clock, CheckCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import Link from 'next/link'

const statusLabels: Record<string, string> = {
  pending: 'Beklemede',
  in_production: 'Üretimde',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  in_transit: 'Yolda',
  delivered: 'Teslim',
}

function formatDate(s: string | null) {
  if (!s) return '–'
  try {
    const d = new Date(s)
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('tr-TR')
  } catch {
    return s
  }
}

export default function BayiDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [me, setMe] = useState<{ user?: { dealer_name?: string | null } } | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [shipments, setShipments] = useState<any[]>([])
  const [account, setAccount] = useState<{ balance?: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setError(null)
      try {
        const [meRes, ordersRes, shipmentsRes, accountRes] = await Promise.all([
          fetchApi('/api/bayi/me').catch(() => null),
          fetchApi('/api/bayi/orders').catch(() => []),
          fetchApi('/api/bayi/shipments').catch(() => []),
          fetchApi('/api/bayi/account').catch(() => ({ account: null })),
        ])
        const meData = (meRes as any)?.user ?? (meRes as any)?.data?.user ?? (meRes as any)
        const ordersList = Array.isArray((ordersRes as any)?.data) ? (ordersRes as any).data : (Array.isArray(ordersRes) ? ordersRes : [])
        const shipmentsList = Array.isArray((shipmentsRes as any)?.data) ? (shipmentsRes as any).data : (Array.isArray(shipmentsRes) ? shipmentsRes : [])
        const acc = (accountRes as any)?.account ?? (accountRes as any)?.data?.account ?? null

        setMe(meData ? { user: typeof meData === 'object' && meData !== null ? meData : { dealer_name: null } } : null)
        setOrders(ordersList)
        setShipments(shipmentsList)
        setAccount(acc)
      } catch (e) {
        setError('Veriler yüklenirken bir hata oluştu.')
        setOrders([])
        setShipments([])
        setAccount(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const dealerName = (me?.user?.dealer_name ?? (user as any)?.dealer_name ?? '').trim() || '–'
  const balance = account?.balance ?? null
  const lastOrders = orders.slice(0, 5)
  const lastShipments = shipments.slice(0, 5)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
        <p className="text-slate-400 text-sm">Yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200 text-sm">
          {error}
        </div>
      )}

      {/* Hoş geldin kartı */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 sm:p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <User className="w-7 h-7 text-blue-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-white truncate">
            Hoş geldiniz, {(user as any)?.full_name || (user as any)?.username || 'Bayi'}
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">Cari: <span className="text-slate-200 font-medium">{dealerName}</span></p>
        </div>
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/bayi/orders"
          className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 hover:bg-slate-700/40 hover:border-slate-600/60 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Siparişlerim</p>
              <p className="text-2xl font-bold text-white mt-1">{orders.length}</p>
            </div>
            <Package className="w-10 h-10 text-amber-500/80 flex-shrink-0" />
          </div>
        </Link>
        <Link
          href="/bayi/shipments"
          className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 hover:bg-slate-700/40 hover:border-slate-600/60 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Sevkiyatlarım</p>
              <p className="text-2xl font-bold text-white mt-1">{shipments.length}</p>
            </div>
            <Truck className="w-10 h-10 text-emerald-500/80 flex-shrink-0" />
          </div>
        </Link>
        <Link
          href="/bayi/account"
          className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 hover:bg-slate-700/40 hover:border-slate-600/60 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-slate-400 text-sm">Cari Bakiye</p>
              <p className="text-xl font-bold text-white mt-1 truncate">
                {balance != null ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(balance) : '–'}
              </p>
            </div>
            <Wallet className="w-10 h-10 text-blue-500/80 flex-shrink-0 ml-2" />
          </div>
        </Link>
      </div>

      {/* Son siparişler */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-slate-700/60">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Package className="w-4 h-4" />
            Son Siparişler
          </h3>
          {orders.length > 0 && (
            <Link
              href="/bayi/orders"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Tümünü gör <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
        <div className="p-4">
          {lastOrders.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Henüz sipariş yok.</p>
          ) : (
            <ul className="space-y-3">
              {lastOrders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-700/40 last:border-0">
                  <div className="min-w-0">
                    <span className="font-mono text-sm text-white">{o.order_number || '–'}</span>
                    <span className="text-slate-400 text-sm ml-2">{o.product_name || '–'}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-slate-400 text-sm">{formatDate(o.order_date)}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      o.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                      o.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                      o.status === 'in_production' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {o.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                      {o.status !== 'completed' && o.status !== 'cancelled' && <Clock className="w-3 h-3" />}
                      {statusLabels[o.status] || o.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Son sevkiyatlar */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-slate-700/60">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Son Sevkiyatlar
          </h3>
          {shipments.length > 0 && (
            <Link
              href="/bayi/shipments"
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Tümünü gör <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
        <div className="p-4">
          {lastShipments.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Henüz sevkiyat yok.</p>
          ) : (
            <ul className="space-y-3">
              {lastShipments.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-700/40 last:border-0">
                  <div>
                    <span className="font-mono text-sm text-white">{s.shipment_number || '–'}</span>
                    <span className="text-slate-400 text-sm ml-2">{formatDate(s.shipment_date)}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    s.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' :
                    s.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                    s.status === 'in_transit' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {statusLabels[s.status] || s.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
