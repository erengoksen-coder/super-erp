'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'
import { formatDate } from '@/lib/utils/dateFormat'
import { getReferenceTypeLabel } from '@/lib/utils/referenceTypeLabels'
import { toast } from '@/lib/notify'

type Material = {
  id: string
  code?: string
  name: string
  unit?: string
}

type Customer = {
  id: string
  code?: string
  name: string
}

type Reservation = {
  id: string
  material_id: string
  customer_id?: string | null
  reference_type?: string | null
  reference_id?: string | null
  quantity: number
  status?: string | null
  notes?: string | null
  created_at?: string | null
}

export default function MaterialReservationsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  const [materialId, setMaterialId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')

  const [filterMaterial, setFilterMaterial] = useState('all')
  const [filterCustomer, setFilterCustomer] = useState('all')

  const filteredReservations = useMemo(() => {
    return reservations.filter((item) => {
      if (filterMaterial !== 'all' && item.material_id !== filterMaterial) return false
      if (filterCustomer !== 'all' && item.customer_id !== filterCustomer) return false
      return true
    })
  }, [reservations, filterMaterial, filterCustomer])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [materialsRes, customersRes, reservationsRes] = await Promise.all([
        fetch('/api/materials'),
        fetch('/api/accounts?type=customer'),
        fetch('/api/materials/reservations'),
      ])
      const materialsJson = materialsRes.ok ? await materialsRes.json() : []
      const customersJson = customersRes.ok ? await customersRes.json() : []
      const reservationsJson = reservationsRes.ok ? await reservationsRes.json() : []

      const normalize = (payload: any) => Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : []

      setMaterials(normalize(materialsJson))
      setCustomers(normalize(customersJson))
      setReservations(normalize(reservationsJson))
    } finally {
      setLoading(false)
    }
  }

  function materialLabel(id: string) {
    const material = materials.find((m) => m.id === id)
    if (!material) return 'Bilinmiyor'
    return `${material.code ? `${material.code} - ` : ''}${material.name}`
  }

  function customerLabel(id?: string | null) {
    if (!id) return '-'
    const customer = customers.find((c) => c.id === id)
    if (!customer) return '-'
    return `${customer.code ? `${customer.code} - ` : ''}${customer.name}`
  }

  async function handleCreate() {
    if (!materialId || !quantity || Number(quantity) <= 0) {
      toast.warning('Malzeme ve pozitif miktar gerekli')
      return
    }
    try {
      const response = await fetch('/api/materials/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: materialId,
          customer_id: customerId || null,
          quantity: Number(quantity),
          notes: notes.trim() || null,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Rezervasyon oluşturulamadı')
      }
      setMaterialId('')
      setCustomerId('')
      setQuantity('')
      setNotes('')
      loadData()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Rezervasyonu iptal etmek istediğinize emin misiniz?')) return
    try {
      const response = await fetch(`/api/materials/reservations?id=${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Rezervasyon iptal edilemedi')
      }
      loadData()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Hammadde Rezervasyonları</h1>
            <p className="text-sm text-gray-400">Malzemeler için rezervasyon oluşturun</p>
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
          <h2 className="text-lg font-semibold text-white mb-4">Yeni Rezervasyon</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Malzeme *</label>
              <select
                value={materialId}
                onChange={(e) => setMaterialId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded"
              >
                <option value="">Seçiniz</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.code ? `${material.code} - ` : ''}{material.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Müşteri</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded"
              >
                <option value="">Seçiniz</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.code ? `${customer.code} - ` : ''}{customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Miktar *</label>
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded"
                placeholder="0"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm text-gray-400 mb-1">Not</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded"
                placeholder="Açıklama"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCreate}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition inline-flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Rezervasyon Listesi</h2>
            <div className="flex items-center space-x-2">
              <select
                value={filterMaterial}
                onChange={(e) => setFilterMaterial(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded text-sm"
              >
                <option value="all">Tüm Malzemeler</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.code ? `${material.code} - ` : ''}{material.name}
                  </option>
                ))}
              </select>
              <select
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded text-sm"
              >
                <option value="all">Tüm Müşteriler</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.code ? `${customer.code} - ` : ''}{customer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Yükleniyor...</div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Kayıt bulunamadı.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="h-8 px-4 py-2 text-xs">Tarih</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Malzeme</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Müşteri</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Miktar</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Referans</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs">Not</TableHead>
                    <TableHead className="h-8 px-4 py-2 text-xs text-right">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations.map((reservation) => (
                    <TableRow key={reservation.id} className="border-gray-800">
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {formatDate(reservation.created_at)}
                      </TableCell>
                      <TableCell className="text-white text-xs px-4 py-2">
                        {materialLabel(reservation.material_id)}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {customerLabel(reservation.customer_id)}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {Number(reservation.quantity).toLocaleString('tr-TR')}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {reservation.reference_type ? `${getReferenceTypeLabel(reservation.reference_type)}${reservation.reference_id ? `: ${reservation.reference_id}` : ''}` : '-'}
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs px-4 py-2">
                        {reservation.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right px-4 py-2">
                        <button
                          onClick={() => handleCancel(reservation.id)}
                          className="text-red-400 hover:text-red-300 transition"
                          title="İptal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
