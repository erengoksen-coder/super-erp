'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils/dateFormat'

type Material = {
  id: string
  code?: string
  name: string
}

type PriceRow = {
  id: string
  material_id: string
  material_name: string
  material_code?: string | null
  material_unit?: string | null
  price: number
  price_type?: string | null
  source_type?: string | null
  source_id?: string | null
  created_at?: string | null
}

export default function MaterialPriceHistoryPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [prices, setPrices] = useState<PriceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMaterial, setFilterMaterial] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filtered = useMemo(() => {
    return prices.filter((row) => {
      if (filterMaterial !== 'all' && row.material_id !== filterMaterial) return false
      if (startDate || endDate) {
        if (!row.created_at) return false
        const dateOnly = row.created_at.split('T')[0]
        if (startDate && dateOnly < startDate) return false
        if (endDate && dateOnly > endDate) return false
      }
      return true
    })
  }, [prices, filterMaterial, startDate, endDate])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [materialsRes, pricesRes] = await Promise.all([
        fetch('/api/materials'),
        fetch('/api/materials/price-history'),
      ])
      const materialsJson = materialsRes.ok ? await materialsRes.json() : []
      const pricesJson = pricesRes.ok ? await pricesRes.json() : []
      const normalize = (payload: any) => Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : []
      setMaterials(normalize(materialsJson))
      setPrices(normalize(pricesJson))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Hammadde Fiyat Geçmişi</h1>
            <p className="text-sm text-gray-400">Tarihsel fiyat değişimleri</p>
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
            <h2 className="text-lg font-semibold text-white">Fiyat Kayıtları</h2>
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
              <select
                value={filterMaterial}
                onChange={(e) => setFilterMaterial(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded text-sm"
              >
                <option value="all">Tüm Malzemeler</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code ? `${m.code} - ` : ''}{m.name}
                  </option>
                ))}
              </select>
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
                    <TableHead className="h-8 px-4 py-2 text-xs">Malzeme</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Birim</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Fiyat</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Kaynak</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id} className="border-gray-800">
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {formatDateTime(row.created_at)}
                      </TableCell>
                      <TableCell className="text-white text-xs px-4 py-2">
                        {row.material_code ? `${row.material_code} - ` : ''}{row.material_name}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {row.material_unit || '-'}
                      </TableCell>
                      <TableCell className="text-green-300 text-xs px-4 py-2">
                        {Number(row.price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {row.source_type || '-'}
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
