'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Download, DollarSign, Wrench, Layers } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'
import { formatDateTime } from '@/lib/utils/dateFormat'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

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

  useEffect(() => { loadData() }, [])

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

  // Özet hesaplama
  const totalMaterial = filtered.reduce((s, r) => s + Number(r.material_cost || 0), 0)
  const totalLabor = filtered.reduce((s, r) => s + Number(r.labor_cost || 0), 0)
  const totalOverhead = filtered.reduce((s, r) => s + Number(r.overhead_cost || 0), 0)
  const totalCost = filtered.reduce((s, r) => s + Number(r.total_cost || 0), 0)
  const avgCost = filtered.length > 0 ? totalCost / filtered.length : 0

  // Grafik verisi (en son 10)
  const chartData = filtered.slice(0, 15).map(r => ({
    name: (r.order_number || r.production_order_id || '').slice(-6),
    Malzeme: Math.round(Number(r.material_cost || 0)),
    İşçilik: Math.round(Number(r.labor_cost || 0)),
    Genel: Math.round(Number(r.overhead_cost || 0)),
  }))

  return (
    <AppDashboardLayout title="Üretim Maliyet Raporu" subtitle="Malzeme + işçilik + genel gider maliyet analizi" icon={DollarSign}>
      {/* Özet Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardBody className="p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Toplam Maliyet</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">₺{totalCost.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Malzeme</p>
            <p className="text-xl font-bold text-blue-500">₺{totalMaterial.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">İşçilik</p>
            <p className="text-xl font-bold text-amber-500">₺{totalLabor.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Genel Gider</p>
            <p className="text-xl font-bold text-purple-500">₺{totalOverhead.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Ort. Birim Maliyet</p>
            <p className="text-xl font-bold text-emerald-500">₺{avgCost.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</p>
          </CardBody>
        </Card>
      </div>

      {/* Maliyet Dağılım Grafiği */}
      {chartData.length > 0 && (
        <Card className="mb-6">
          <CardBody className="p-4">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-4">
              Üretim Bazlı Maliyet Dağılımı
            </h3>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tickFormatter={(v: number) => `₺${(v / 1000).toFixed(0)}K`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                    formatter={(value: number) => [`₺${value.toLocaleString('tr-TR')}`, '']}
                  />
                  <Legend />
                  <Bar dataKey="Malzeme" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="İşçilik" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Genel" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Maliyet Kompozisyon Bar */}
      {totalCost > 0 && (
        <Card className="mb-6">
          <CardBody className="p-4">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-3">
              Maliyet Kompozisyonu
            </h3>
            <div className="flex h-5 rounded-full overflow-hidden mb-3">
              <div className="bg-blue-500 transition-all" style={{ width: `${(totalMaterial / totalCost) * 100}%` }} title={`Malzeme: %${((totalMaterial / totalCost) * 100).toFixed(1)}`} />
              <div className="bg-amber-500 transition-all" style={{ width: `${(totalLabor / totalCost) * 100}%` }} title={`İşçilik: %${((totalLabor / totalCost) * 100).toFixed(1)}`} />
              <div className="bg-purple-500 transition-all" style={{ width: `${(totalOverhead / totalCost) * 100}%` }} title={`Genel: %${((totalOverhead / totalCost) * 100).toFixed(1)}`} />
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-xs text-gray-500">Malzeme %{((totalMaterial / totalCost) * 100).toFixed(0)}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-xs text-gray-500">İşçilik %{((totalLabor / totalCost) * 100).toFixed(0)}</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500" /><span className="text-xs text-gray-500">Genel Gider %{((totalOverhead / totalCost) * 100).toFixed(0)}</span></div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Filtre */}
      <Card className="mb-4">
        <CardBody className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500" />
            <span className="text-gray-400">→</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500" />
            <Button variant="outline" size="sm" onClick={() => { setStartDate(''); setEndDate('') }}>Temizle</Button>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="w-4 h-4 mr-1" />Yenile</Button>
          </div>
        </CardBody>
      </Card>

      {/* Tablo */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <Card><CardBody className="p-12 text-center"><p className="text-gray-500">Kayıt bulunamadı</p></CardBody></Card>
      ) : (
        <Card>
          <CardBody className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="h-8 px-4 py-2 text-xs">Tarih</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">Üretim No</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs">Ürün</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs text-right">Malzeme</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs text-right">İşçilik</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs text-right">Genel</TableHead>
                  <TableHead className="h-8 px-4 py-2 text-xs text-right">Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(row => (
                  <TableRow key={row.id} className="border-gray-800">
                    <TableCell className="text-gray-300 text-xs px-4 py-2">{formatDateTime(row.created_at)}</TableCell>
                    <TableCell className="text-white text-xs px-4 py-2">{row.order_number || row.production_order_id}</TableCell>
                    <TableCell className="text-gray-300 text-xs px-4 py-2">{row.product_sku ? `${row.product_sku} - ` : ''}{row.product_name || '-'}</TableCell>
                    <TableCell className="text-blue-300 text-xs px-4 py-2 text-right">₺{Number(row.material_cost).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-amber-300 text-xs px-4 py-2 text-right">₺{Number(row.labor_cost).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-purple-300 text-xs px-4 py-2 text-right">₺{Number(row.overhead_cost).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-emerald-300 text-xs px-4 py-2 text-right font-medium">₺{Number(row.total_cost).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </AppDashboardLayout>
  )
}
