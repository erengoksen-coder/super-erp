'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, FileSpreadsheet } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { fetchApi } from '@/lib/api/client'

type ProductionOrder = {
  id: string
  order_number: string
  product_name?: string | null
}

type Operation = {
  id: string
  name: string
}

type WorkCenter = {
  id: string
  name: string
}

type Personnel = {
  id: string
  full_name: string
}

type OrderOperation = {
  id: string
  production_order_id: string
  operation_id: string
  work_center_id: string | null
  personnel_id: string | null
  planned_start: string | null
  planned_end: string | null
  actual_start: string | null
  actual_end: string | null
  planned_duration_minutes: number
  actual_duration_minutes: number
  status: string
  delay_reason: string | null
  notes: string | null
  operation_name: string
  work_center_name: string | null
  personnel_name: string | null
  order_number: string | null
  product_name: string | null
}

function toInputDateTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return ''
  return date.toISOString().slice(0, 16)
}

function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    const record = data as { data?: unknown; value?: unknown }
    if (Array.isArray(record.data)) return record.data as T[]
    if (Array.isArray(record.value)) return record.value as T[]
  }
  return []
}

export default function OrderOperationsPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([])
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [rows, setRows] = useState<OrderOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    production_order_id: '',
    operation_id: '',
    work_center_id: '',
    personnel_id: '',
    planned_start: '',
    planned_end: '',
    actual_start: '',
    actual_end: '',
    planned_duration_minutes: '',
    actual_duration_minutes: '',
    status: 'planned',
    delay_reason: '',
    notes: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        fetchApi('/api/production'),
        fetchApi('/api/operations'),
        fetchApi('/api/work-centers'),
        fetchApi('/api/personnel'),
        fetchApi('/api/production/order-operations'),
      ])

      const getValue = <T,>(index: number) => {
        const result = results[index]
        if (result && result.status === 'fulfilled') return result.value as T
        return null
      }

      const orderRows = normalizeList<ProductionOrder>(getValue(0))
      const ops = normalizeList<Operation>(getValue(1))
      const centers = normalizeList<WorkCenter>(getValue(2))
      const people = normalizeList<Personnel>(getValue(3))
      const opsRows = normalizeList<OrderOperation>(getValue(4))

      setOrders(orderRows)
      setOperations(ops)
      setWorkCenters(centers)
      setPersonnel(people)
      setRows(opsRows)
    } catch (error) {
      console.error('Operasyon verileri yüklenemedi:', error)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const delayMinutes = useMemo(() => {
    const planned = Number(form.planned_duration_minutes) || 0
    const actual = Number(form.actual_duration_minutes) || 0
    return actual > planned ? actual - planned : 0
  }, [form.planned_duration_minutes, form.actual_duration_minutes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.production_order_id || !form.operation_id) {
      alert('Üretim emri ve operasyon zorunludur')
      return
    }
    setSaving(true)
    try {
      await fetchApi('/api/production/order-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          production_order_id: form.production_order_id,
          operation_id: form.operation_id,
          work_center_id: form.work_center_id || null,
          personnel_id: form.personnel_id || null,
          planned_start: form.planned_start || null,
          planned_end: form.planned_end || null,
          actual_start: form.actual_start || null,
          actual_end: form.actual_end || null,
          planned_duration_minutes: Number(form.planned_duration_minutes) || 0,
          actual_duration_minutes: Number(form.actual_duration_minutes) || 0,
          status: form.status || 'planned',
          delay_reason: delayMinutes > 0 ? form.delay_reason || null : null,
          notes: form.notes || null,
        }),
      })
      setForm({
        production_order_id: '',
        operation_id: '',
        work_center_id: '',
        personnel_id: '',
        planned_start: '',
        planned_end: '',
        actual_start: '',
        actual_end: '',
        planned_duration_minutes: '',
        actual_duration_minutes: '',
        status: 'planned',
        delay_reason: '',
        notes: '',
      })
      await loadData()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-2">
            <FileSpreadsheet className="w-8 h-8" />
            <span>Üretim Operasyonları</span>
          </h1>
          <p className="text-gray-400">Operasyon sürelerini, istasyon ve personeli takip edin.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Üretim Emri *</label>
            <select
              value={form.production_order_id}
              onChange={(e) => setForm({ ...form, production_order_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              required
            >
              <option value="">Seçin</option>
              {orders.length === 0 && <option value="" disabled>Kayıt yok</option>}
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.order_number} {order.product_name ? `- ${order.product_name}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Operasyon *</label>
            <select
              value={form.operation_id}
              onChange={(e) => setForm({ ...form, operation_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              required
            >
              <option value="">Seçin</option>
              {operations.length === 0 && <option value="" disabled>Kayıt yok</option>}
              {operations.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Durum</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            >
              <option value="planned">Planlandı</option>
              <option value="in_progress">Devam Ediyor</option>
              <option value="completed">Tamamlandı</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">İstasyon</label>
            <select
              value={form.work_center_id}
              onChange={(e) => setForm({ ...form, work_center_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            >
              <option value="">Seçin</option>
              {workCenters.length === 0 && <option value="" disabled>Kayıt yok</option>}
              {workCenters.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Personel</label>
            <select
              value={form.personnel_id}
              onChange={(e) => setForm({ ...form, personnel_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            >
              <option value="">Seçin</option>
              {personnel.length === 0 && <option value="" disabled>Kayıt yok</option>}
              {personnel.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Plan Süresi (dk)</label>
            <input
              type="number"
              min="0"
              value={form.planned_duration_minutes}
              onChange={(e) => setForm({ ...form, planned_duration_minutes: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Gerçek Süre (dk)</label>
            <input
              type="number"
              min="0"
              value={form.actual_duration_minutes}
              onChange={(e) => setForm({ ...form, actual_duration_minutes: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Plan Başlangıç</label>
            <input
              type="datetime-local"
              value={form.planned_start}
              onChange={(e) => setForm({ ...form, planned_start: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Plan Bitiş</label>
            <input
              type="datetime-local"
              value={form.planned_end}
              onChange={(e) => setForm({ ...form, planned_end: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Gerçek Başlangıç</label>
            <input
              type="datetime-local"
              value={form.actual_start}
              onChange={(e) => setForm({ ...form, actual_start: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Gerçek Bitiş</label>
            <input
              type="datetime-local"
              value={form.actual_end}
              onChange={(e) => setForm({ ...form, actual_end: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
        </div>

        {delayMinutes > 0 && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-sm text-yellow-200">
            Planlanan süre {form.planned_duration_minutes || 0} dk, gerçekleşen {form.actual_duration_minutes || 0} dk. Gecikme nedeni girin.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Gecikme Nedeni</label>
            <input
              value={form.delay_reason}
              onChange={(e) => setForm({ ...form, delay_reason: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="Örn: Makine arızası"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notlar</label>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="Açıklama"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center space-x-2 disabled:opacity-50"
          >
            <Plus size={16} />
            <span>{saving ? 'Kaydediliyor...' : 'Operasyon Ekle'}</span>
          </button>
        </div>
      </form>

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800">
              <TableHead className="h-8">Üretim Emri</TableHead>
              <TableHead className="h-8">Operasyon</TableHead>
              <TableHead className="h-8">İstasyon</TableHead>
              <TableHead className="h-8">Personel</TableHead>
              <TableHead className="h-8 text-right">Plan</TableHead>
              <TableHead className="h-8 text-right">Gerçek</TableHead>
              <TableHead className="h-8">Gecikme Nedeni</TableHead>
              <TableHead className="h-8">Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-400 text-xs py-8">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-400 text-xs py-8">
                  Operasyon kaydı bulunamadı
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-white text-xs">
                    {row.order_number || '-'} {row.product_name ? `- ${row.product_name}` : ''}
                  </TableCell>
                  <TableCell className="text-white text-xs">{row.operation_name}</TableCell>
                  <TableCell className="text-gray-400 text-xs">{row.work_center_name || '-'}</TableCell>
                  <TableCell className="text-gray-400 text-xs">{row.personnel_name || '-'}</TableCell>
                  <TableCell className="text-right text-white text-xs">
                    {(row.planned_duration_minutes || 0).toLocaleString('tr-TR')} dk
                  </TableCell>
                  <TableCell className="text-right text-white text-xs">
                    {(row.actual_duration_minutes || 0).toLocaleString('tr-TR')} dk
                  </TableCell>
                  <TableCell className="text-gray-400 text-xs">{row.delay_reason || '-'}</TableCell>
                  <TableCell className="text-gray-400 text-xs">{row.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
