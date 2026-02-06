'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils/dateFormat'

type CostRow = {
  id: string
  production_order_id: string
  order_number?: string
  product_name?: string
  product_sku?: string
  material_cost: number
  labor_cost: number
  overhead_cost: number
  total_cost: number
  created_at?: string | null
}

export default function ProductionCostsReportPage() {
  const [rows, setRows] = useState<CostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const filtered = rows.filter((row) => {
    if (startDate || endDate) {
      if (!row.created_at) return false
      const dateOnly = row.created_at.split('T')[0]
      if (startDate && dateOnly < startDate) return false
      if (endDate && dateOnly > endDate) return false
    }
    return true
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const response = await fetch('/api/production/costs')
      const data = response.ok ? await response.json() : []
      const normalized = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
      setRows(normalized)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Üretim Maliyet Raporu</h1>
            <p className="text-sm text-gray-400">Malzeme + işçilik maliyetleri</p>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition inline-flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Yenile</span>
          </button>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-white">Kayıtlar</h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded text-sm"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded text-sm"
              />
              <button
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
                className="px-3 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 transition"
              >
                Temizle
              </button>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Kayıt bulunamadı.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="h-8 px-4 py-2 text-xs">Tarih</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Üretim No</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Ürün</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Malzeme</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">İşçilik</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Toplam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id} className="border-gray-800">
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {formatDateTime(row.created_at)}
                      </TableCell>
                      <TableCell className="text-white text-xs px-4 py-2">
                        {row.order_number || row.production_order_id}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {row.product_sku ? `${row.product_sku} - ` : ''}{row.product_name || '-'}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {Number(row.material_cost).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {Number(row.labor_cost).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                      </TableCell>
                      <TableCell className="text-green-300 text-xs px-4 py-2">
                        {Number(row.total_cost).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
