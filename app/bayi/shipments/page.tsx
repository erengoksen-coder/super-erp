'use client'

import { useState, useEffect, useMemo } from 'react'
import { Truck, Package } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'

type Shipment = {
  id: string
  shipment_number: string
  shipment_date: string
  status: string
  total_quantity: number
  total_amount: number | null
  final_amount: number | null
  customer_name: string | null
  items?: { product_name: string; product_sku: string; quantity: number; unit_price: number | null; total_price: number | null }[]
}

const statusLabels: Record<string, string> = {
  pending: 'Beklemede',
  in_transit: 'Yolda',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
}

function formatDate(s: string) {
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

export default function BayiShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    setError(null)
    setLoading(true)
    fetchApi('/api/bayi/shipments' + (statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''))
      .then((res: any) => {
        const data = (res as any)?.data ?? (Array.isArray(res) ? res : [])
        setShipments(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        setShipments([])
        setError('Sevkiyatlar yüklenirken hata oluştu.')
      })
      .finally(() => setLoading(false))
  }, [statusFilter])

  const filteredShipments = useMemo(() => {
    let list = [...shipments]
    if (dateFrom) {
      const t = parseDate(dateFrom + 'T00:00:00')
      list = list.filter((s) => parseDate(s.shipment_date) >= t)
    }
    if (dateTo) {
      const t = parseDate(dateTo + 'T23:59:59')
      list = list.filter((s) => parseDate(s.shipment_date) <= t)
    }
    return list
  }, [shipments, dateFrom, dateTo])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Sevkiyatlarım
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${!statusFilter ? 'bg-blue-600 text-white' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600'}`}
          >
            Tümü
          </button>
          {['pending', 'in_transit', 'delivered', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600'}`}
            >
              {statusLabels[s] || s}
            </button>
          ))}
        </div>
      </div>

      {/* Tarih filtresi */}
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

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      ) : filteredShipments.length === 0 ? (
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-8 text-center text-slate-400">
          {shipments.length === 0 ? 'Henüz sevkiyat bulunmuyor.' : 'Tarih aralığına uygun sevkiyat yok.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredShipments.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden"
            >
              <div className="p-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-medium text-white">{s.shipment_number}</span>
                  <span className="text-slate-400 text-sm">{formatDate(s.shipment_date)}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                  s.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' :
                  s.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                  s.status === 'in_transit' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {statusLabels[s.status] || s.status}
                </span>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-4 text-sm text-slate-300 mb-3">
                  <span>Toplam adet: <strong className="text-white">{s.total_quantity ?? 0}</strong></span>
                  {s.final_amount != null && (
                    <span>Tutar: <strong className="text-white">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(s.final_amount)}</strong></span>
                  )}
                </div>
                {s.items && s.items.length > 0 && (
                  <div className="rounded-lg bg-slate-900/50 p-3">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Kalemler</p>
                    <ul className="space-y-1">
                      {s.items.map((item, i) => (
                        <li key={i} className="flex justify-between text-sm text-slate-300 gap-2">
                          <span className="min-w-0 truncate">{item.product_name || item.product_sku || 'Ürün'}</span>
                          <span className="shrink-0">{item.quantity} adet · {item.total_price != null ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.total_price) : '–'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
