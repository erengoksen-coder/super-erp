'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, RefreshCw, ArrowLeft, Printer } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { LogoWithBackground } from '@/components/Logo'
import { formatDate } from '@/lib/utils/dateFormat'
import { getReferenceTypeLabel } from '@/lib/utils/referenceTypeLabels'
import { ReportFilters, getDefaultReportFilters } from '@/components/filters/ReportFilters'

type MovementRow = {
  id: string
  material_id: string | null
  product_id: string | null
  movement_type: string
  quantity: number
  reference_type: string | null
  reference_id: string | null
  invoice_number: string | null
  shipment_number: string | null
  notes: string | null
  created_at: string
  material_name: string | null
  material_code: string | null
  product_name: string | null
  product_sku: string | null
}

type StockMovementsRes = {
  from: string | null
  to: string | null
  summary?: { total: number; byType?: Record<string, number>; totalInQty?: number; totalOutQty?: number }
  items: MovementRow[]
}

export default function StockMovementsReportPage() {
  const [filters, setFilters] = useState(getDefaultReportFilters)
  const [data, setData] = useState<StockMovementsRes | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetchApi<StockMovementsRes>(`/api/reports/stock-movements?from=${filters.from}&to=${filters.to}&limit=300`)
      .then((res: any) => {
        const d = res?.data ?? res
        setData(d)
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const items = (data?.items ?? []) as MovementRow[]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-amber-400" />
              Stok Hareketleri
            </h1>
            <LogoWithBackground size="sm" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportFilters value={filters} onChange={setFilters} />
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Güncelle
          </button>
          <button type="button" onClick={() => window.print()} className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Yazdır
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
      ) : data ? (
        <>
          {(data as any).summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-xs uppercase">Toplam hareket</div>
                <div className="text-xl font-bold text-white">{(data as any).summary.total}</div>
              </div>
              <div className="bg-green-900/30 rounded-lg p-4 border border-green-800/50">
                <div className="text-green-400 text-xs uppercase">Giriş (adet)</div>
                <div className="text-xl font-bold text-green-300">{(data as any).summary.byType?.in ?? 0}</div>
              </div>
              <div className="bg-red-900/30 rounded-lg p-4 border border-red-800/50">
                <div className="text-red-400 text-xs uppercase">Çıkış (adet)</div>
                <div className="text-xl font-bold text-red-300">{(data as any).summary.byType?.out ?? 0}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-xs uppercase">Giriş / Çıkış miktar</div>
                <div className="text-sm font-semibold text-green-300">{(data as any).summary.totalInQty ?? 0}</div>
                <div className="text-sm font-semibold text-red-300">{(data as any).summary.totalOutQty ?? 0}</div>
              </div>
            </div>
          )}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4">Tür</th>
                  <th className="py-3 px-4">Malzeme / Ürün</th>
                  <th className="py-3 px-4 text-right">Miktar</th>
                  <th className="py-3 px-4">Referans</th>
                  <th className="py-3 px-4">Fatura / Sevkiyat</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-gray-800/50 text-gray-200">
                    <td className="py-2 px-4">{formatDate(row.created_at)}</td>
                    <td className="py-2 px-4">
                      <span className={row.movement_type === 'in' ? 'text-green-400' : 'text-red-400'}>
                        {row.movement_type === 'in' ? 'Giriş' : 'Çıkış'}
                      </span>
                    </td>
                    <td className="py-2 px-4">{row.material_name || row.product_name || row.material_code || row.product_sku || '–'}</td>
                    <td className="py-2 px-4 text-right">{row.quantity}</td>
                    <td className="py-2 px-4">{getReferenceTypeLabel(row.reference_type)}</td>
                    <td className="py-2 px-4">{row.invoice_number || row.shipment_number || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!items.length && (
            <p className="py-8 text-center text-gray-500">Bu dönemde hareket bulunamadı.</p>
          )}
        </div>
        </>
      ) : (
        <p className="text-gray-500 py-8">Veri yüklenemedi.</p>
      )}
    </div>
  )
}
