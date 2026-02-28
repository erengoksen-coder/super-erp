'use client'

import { useState, useEffect } from 'react'
import { Package, Truck, Wallet, User, ChevronRight, Clock, CheckCircle, Target, TrendingUp, AlertCircle, Bell } from 'lucide-react'
import { safeFetch } from '@/lib/api/client'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/lib/store/authStore'
import Link from 'next/link'

const statusLabels: Record<string, string> = {
  pending: 'Beklemede',
  approval_pending: 'Onay Bekliyor',
  processing: 'İşleniyor',
  in_production: 'Üretimde',
  ready_for_dispatch: 'Sevkiyata Hazır',
  dispatched: 'Sevk Edildi',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  in_transit: 'Yolda / Kargo',
  delivered: 'Teslim Edildi',
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

  const [dashboardData, setDashboardData] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [shipments, setShipments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, ordersRes, shipmentsRes, dashRes] = await Promise.all([
          safeFetch('/api/bayi/me'),
          safeFetch('/api/bayi/orders'),
          safeFetch('/api/bayi/shipments'),
          safeFetch('/api/bayi/dashboard'),
        ])

        const meData = (meRes as any)?.user ?? (meRes as any)?.data?.user ?? (meRes as any)
        const ordersList = Array.isArray((ordersRes as any)?.data) ? (ordersRes as any).data : (Array.isArray(ordersRes) ? ordersRes : [])
        const shipmentsList = Array.isArray((shipmentsRes as any)?.data) ? (shipmentsRes as any).data : (Array.isArray(shipmentsRes) ? shipmentsRes : [])

        setMe(meData ? { user: typeof meData === 'object' && meData !== null ? meData : { dealer_name: null } } : null)
        setOrders(ordersList)
        setShipments(shipmentsList)
        if ((dashRes as any)?.success) {
          setDashboardData((dashRes as any).data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const dealerName = (me?.user?.dealer_name ?? (user as any)?.dealer_name ?? '').trim() || 'Bayi Ana Sayfası'
  const lastOrders = orders.slice(0, 5)
  const lastShipments = shipments.slice(0, 5)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm">Dashboard Yükleniyor...</p>
      </div>
    )
  }

  const perf = dashboardData?.performance || { progressPercent: 0, currentRevenue: 0, monthTarget: 0 }
  const isTargetAchieved = perf.progressPercent >= 100

  return (
    <div className="space-y-6">
      {/* Üst Karşılama */}
      <div className="relative overflow-hidden flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-slate-900 border border-slate-700/50 rounded-[2rem] p-8 shadow-2xl">
        {/* Dekoratif Gradient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/5 blur-[100px] rounded-full -ml-20 -mb-20"></div>

        <div className="relative flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-[0_8px_30px_rgb(37,99,235,0.3)] transform hover:rotate-3 transition-transform duration-500">
            <StoreIcon className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-blue-100 drop-shadow-md">
              Hoş Geldiniz, <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{(user as any)?.full_name || 'B2B Partneri'}</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></span>
              <p className="text-blue-200/70 text-sm font-extrabold tracking-widest uppercase opacity-90">{dealerName}</p>
            </div>
          </div>
        </div>

        <div className="relative flex gap-4">
          <Link href="/bayi/orders/new" className="group px-7 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all flex items-center gap-3 shadow-[0_10px_20px_rgba(37,99,235,0.3)] hover:translate-y-[-2px] active:translate-y-[0px]">
            <Package className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Yeni Sipariş Ver
          </Link>
        </div>
      </div>

      {/* Duyurular & Kampanyalar Panosu */}
      {dashboardData?.announcements?.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Bell className="w-32 h-32 text-amber-500" />
          </div>
          <div className="relative z-10">
            <h3 className="text-amber-400 font-bold flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 animate-pulse" />
              Sistem Duyuruları & Kampanyalar
            </h3>
            <div className="space-y-3">
              {dashboardData.announcements.map((a: any) => (
                <div key={a.id} className="bg-slate-900/50 rounded-lg p-3 border border-amber-500/10 backdrop-blur-sm">
                  <h4 className="text-blue-50 font-bold">{a.title}</h4>
                  <p className="text-sky-100/60 text-sm mt-1">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Oyunlaştırılmış Performans & Hedef Bölümü */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-700/50 rounded-[2rem] p-8 relative overflow-hidden shadow-2xl">
          {/* Arka plan deseni veya ışığı */}
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full"></div>

          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-black bg-gradient-to-r from-blue-100 to-slate-400 bg-clip-text text-transparent flex items-center gap-3 mb-2">
                <Target className="w-6 h-6 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                AYLIK PERFORMANS PLANI
              </h3>
              <p className="text-base text-blue-100/80 leading-relaxed max-w-lg font-bold">Ciro hedefinize odaklanın, baremleri aşarak ekstra iskontoların ve <span className="text-indigo-400 font-black drop-shadow-[0_0_5px_rgba(129,140,248,0.3)]">VIP ayrıcalıkların</span> sahibi olun.</p>
            </div>
            {isTargetAchieved && (
              <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-900/10 transition-all hover:scale-105">
                <CheckCircle className="w-4 h-4" />
                HEDEF TAMAMLANDI
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-1">
              <span className="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">Mevcut Cironuz (Net)</span>
              <div className="text-4xl font-black text-sky-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(perf.currentRevenue)}
              </div>
            </div>
            <div className="space-y-1 md:text-right">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aylık Kota Hedefi</span>
              <div className="text-3xl font-bold text-slate-400">
                {perf.monthTarget > 0 ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(perf.monthTarget) : 'Belirlenmedi'}
              </div>
            </div>
          </div>

          <div className="relative mb-8">
            {/* Progress Bar Label */}
            <div className="absolute -top-6 right-0 text-xs font-black text-indigo-400">
              %{perf.progressPercent} DOLULUK
            </div>
            {/* Progress Bar */}
            <div className="h-6 w-full bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-inner p-1">
              <div
                className={`h-full rounded-xl transition-all duration-1000 relative shadow-lg ${isTargetAchieved ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-indigo-600'}`}
                style={{ width: `${Math.min(100, perf.progressPercent)}%` }}
              >
                {!isTargetAchieved && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-full animate-[shimmer_2s_infinite]"></div>
                )}
              </div>
            </div>
          </div>

          {!isTargetAchieved && perf.monthTarget > 0 && (
            <div className="flex items-center gap-3 bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/10">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <p className="text-sm font-medium text-slate-300">
                Bir sonraki seviye için <b>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(perf.monthTarget - perf.currentRevenue)}</b> tutarında yeni sipariş gerekiyor.
              </p>
            </div>
          )}
        </div>

        {/* Hızlı İstatistikler */}
        <div className="grid grid-rows-2 gap-6">
          <Link href="/bayi/tickets" className="group bg-slate-900 border border-slate-700/50 rounded-[2rem] p-8 hover:bg-slate-800 transition-all duration-300 flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Aktif Servis Talepleri (SSH)</p>
              <p className="text-5xl font-black text-sky-100 group-hover:text-blue-400 transition-all duration-500 group-hover:scale-110 origin-left drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                {dashboardData?.stats?.activeTickets || 0}
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 group-hover:bg-blue-600/30 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] flex items-center justify-center transition-all duration-500 border border-blue-500/10 group-hover:border-blue-500/50">
              <AlertCircle className="w-9 h-9 text-blue-500 group-hover:text-blue-400 transition-colors" />
            </div>
          </Link>

          <Link href="/bayi/orders" className="group bg-slate-900 border border-slate-700/50 rounded-[2rem] p-8 hover:bg-slate-800 transition-all duration-300 flex items-center justify-between shadow-xl">
            <div className="space-y-1">
              <p className="text-xs font-black text-amber-500 uppercase tracking-widest">Sevkiyat Bekleyen Üretimler</p>
              <p className="text-5xl font-black text-sky-100 group-hover:text-amber-500 transition-all duration-500 group-hover:scale-110 origin-left drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                {dashboardData?.stats?.pendingOrders || 0}
              </p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 group-hover:bg-amber-600/30 group-hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center justify-center transition-all duration-500 border border-amber-500/10 group-hover:border-amber-500/50">
              <Clock className="w-9 h-9 text-amber-500 group-hover:text-amber-400 transition-colors" />
            </div>
          </Link>
        </div>
      </div>

      {/* Siparişler & Sevkiyatlar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {/* Son Siparişler */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 overflow-hidden flex flex-col">
          <div className="p-5 flex items-center justify-between border-b border-slate-700/60">
            <h3 className="font-bold text-sky-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              Sipariş Geçmişi
            </h3>
            <Link href="/bayi/orders" className="text-sm border border-slate-600 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition">
              Tümünü Gör
            </Link>
          </div>
          <div className="flex-1 p-3">
            {lastOrders.length === 0 ? (
              <EmptyState title="Henüz sipariş yok" description="Siparişleriniz burada görünecek." icon={Package} className="py-10" />
            ) : (
              <ul className="space-y-2">
                {lastOrders.map((o) => (
                  <Link href={`/bayi/orders/${o.id}`} key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer group border border-transparent hover:border-slate-700/50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-black text-blue-100 group-hover:text-blue-400 transition-colors">{o.order_number || '–'}</span>
                        <span className="text-xs font-medium text-slate-400 bg-slate-800/50 border border-slate-700/50 px-2 py-0.5 rounded-md">{formatDate(o.created_at || o.order_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-sky-200 font-semibold truncate max-w-[150px] sm:max-w-[200px]" title={o.product_name}>
                          {o.product_name || 'Ürün Yok'}
                        </span>
                        {o.customer_name && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400 truncate max-w-[150px] sm:max-w-[200px]" title={o.customer_name}>
                              {o.customer_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${o.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                        o.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                          'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                        {statusLabels[o.status] || o.status}
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Son Sevkiyatlar */}
        <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 overflow-hidden flex flex-col">
          <div className="p-5 flex items-center justify-between border-b border-slate-700/60">
            <h3 className="font-bold text-sky-100 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-400" />
              Sipariş Teslimatları
            </h3>
            <Link href="/bayi/shipments" className="text-sm border border-slate-600 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition">
              Tümünü Gör
            </Link>
          </div>
          <div className="flex-1 p-3">
            {lastShipments.length === 0 ? (
              <EmptyState title="Henüz sevkiyat yok" description="Kargolarınız burada görünecek." icon={Truck} className="py-10" />
            ) : (
              <ul className="space-y-2">
                {lastShipments.map((s) => (
                  <li key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                    <div>
                      <span className="font-mono text-sm font-black text-blue-100 block mb-1">{s.shipment_number || '–'}</span>
                      <span className="text-blue-200/40 text-sm flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(s.created_at || s.shipment_date)}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${s.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      s.status === 'in_transit' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                        'bg-slate-800 text-slate-400 border-slate-700'
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
    </div>
  )
}

function StoreIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" /><path d="M2 7h20" /><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
    </svg>
  )
}
