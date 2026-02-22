'use client'

import { useState, useEffect, useMemo } from 'react'
import { Package, Clock, CheckCircle, XCircle, Search } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { EmptyState } from '@/components/ui/EmptyState'

type Order = {
  id: string
  order_number: string
  dealer_name: string | null
  customer_name: string | null
  product_name: string
  product_sku: string | null
  quantity: number
  unit_price: number | null
  total_amount: number | null
  order_date: string | null
  status: string
  production_order_number: string | null
  created_at: string
}

const statusLabels: Record<string, string> = {
  pending: 'Beklemede',
  in_production: 'Üretimde',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
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

function parseDate(s: string): number {
  const d = new Date(s)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

export default function BayiOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    setError(null)
    setLoading(true)
    fetchApi('/api/bayi/orders' + (statusFilter !== 'all' ? `?status=${statusFilter}` : ''))
      .then((res: any) => {
        const data = (res as any)?.data ?? (Array.isArray(res) ? res : [])
        setOrders(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setOrders([])
        setError('Siparişler yüklenirken hata oluştu.')
      })
      .finally(() => setLoading(false))
  }, [statusFilter])

  const filteredOrders = useMemo(() => {
    let list = [...orders]
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (o) =>
          (o.order_number || '').toLowerCase().includes(q) ||
          (o.product_name || '').toLowerCase().includes(q) ||
          (o.customer_name || '').toLowerCase().includes(q) ||
          (o.product_sku || '').toLowerCase().includes(q)
      )
    }
    if (dateFrom) {
      const t = parseDate(dateFrom + 'T00:00:00')
      list = list.filter((o) => parseDate(o.order_date || o.created_at || '') >= t)
    }
    if (dateTo) {
      const t = parseDate(dateTo + 'T23:59:59')
      list = list.filter((o) => parseDate(o.order_date || o.created_at || '') <= t)
    }
    return list
  }, [orders, search, dateFrom, dateTo])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Package className="w-5 h-5" />
          Siparişlerim
        </h2>
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'in_production', 'completed', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {s === 'all' ? 'Tümü' : statusLabels[s] || s}
            </button>
          ))}
        </div>
      </div>

      {/* Arama ve tarih */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="search"
            placeholder="Sipariş no, ürün, müşteri..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-500 text-sm">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-6">
          <EmptyState
            title={orders.length === 0 ? 'Henüz sipariş bulunmuyor' : 'Sonuç bulunamadı'}
            description={orders.length === 0 ? 'Siparişleriniz burada listelenir.' : 'Arama veya filtreye uygun sipariş yok.'}
            icon={Package}
          />
        </div>
      ) : (
        <>
          {/* Masaüstü: tablo */}
          <div className="hidden md:block rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-sm">
                    <th className="p-3 font-medium">Sipariş No</th>
                    <th className="p-3 font-medium">Ürün</th>
                    <th className="p-3 font-medium">Miktar</th>
                    <th className="p-3 font-medium">Tutar</th>
                    <th className="p-3 font-medium">Sipariş Tarihi</th>
                    <th className="p-3 font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="border-b border-slate-700/60 hover:bg-slate-700/20">
                      <td className="p-3 font-mono text-sm text-white">{o.order_number || '–'}</td>
                      <td className="p-3 text-slate-200">{o.product_name || '–'}</td>
                      <td className="p-3 text-slate-200">{o.quantity ?? '–'}</td>
                      <td className="p-3 text-slate-200">
                        {o.total_amount != null ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(o.total_amount) : '–'}
                      </td>
                      <td className="p-3 text-slate-400 text-sm">{formatDate(o.order_date)}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          o.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          o.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                          o.status === 'in_production' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {o.status === 'completed' && <CheckCircle className="w-3.5 h-3.5" />}
                          {o.status === 'cancelled' && <XCircle className="w-3.5 h-3.5" />}
                          {(o.status === 'pending' || o.status === 'in_production') && <Clock className="w-3.5 h-3.5" />}
                          {statusLabels[o.status] || o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobil: kartlar */}
          <div className="md:hidden space-y-3">
            {filteredOrders.map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 space-y-2"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-mono text-sm font-medium text-white">{o.order_number || '–'}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium shrink-0 ${
                    o.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    o.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                    o.status === 'in_production' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {statusLabels[o.status] || o.status}
                  </span>
                </div>
                <p className="text-slate-200 text-sm">{o.product_name || '–'}</p>
                <div className="flex justify-between text-sm text-slate-400">
                  <span>{o.quantity ?? '–'} adet</span>
                  <span>{formatDate(o.order_date)}</span>
                </div>
                {o.total_amount != null && (
                  <p className="text-slate-200 font-medium">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(o.total_amount)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
