'use client'

import { useMemo, useEffect, useState } from 'react'
import { fetchApi } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

type PurchaseRequest = {
  id: string
  request_number: string
  material_id: string
  material_name?: string | null
  requested_quantity: number
  unit_price?: number | null
  total_amount?: number | null
  status: string
  created_at: string
  supplier_name?: string | null
  notes?: string | null
}

export default function ProcurementClient() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null)
  const [form, setForm] = useState({
    material_id: '',
    requested_quantity: '',
    unit_price: '',
    supplier_name: '',
    notes: '',
  })
  const [editForm, setEditForm] = useState({
    status: 'draft',
    requested_quantity: '',
    unit_price: '',
    supplier_name: '',
  })

  async function loadRequests() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApi<PurchaseRequest[]>('/api/procurement/purchase-requests')
      setRequests(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Satın alma talepleri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  useEffect(() => {
    if (!selectedRequest) return
    setEditForm({
      status: selectedRequest.status || 'draft',
      requested_quantity: String(selectedRequest.requested_quantity ?? ''),
      unit_price: selectedRequest.unit_price ? String(selectedRequest.unit_price) : '',
      supplier_name: selectedRequest.supplier_name || '',
    })
  }, [selectedRequest])

  async function createRequest() {
    setError(null)
    await fetchApi('/api/procurement/purchase-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        material_id: form.material_id,
        requested_quantity: Number(form.requested_quantity),
        unit_price: form.unit_price ? Number(form.unit_price) : undefined,
        supplier_name: form.supplier_name || undefined,
        notes: form.notes || undefined,
      }),
    })
    setForm({
      material_id: '',
      requested_quantity: '',
      unit_price: '',
      supplier_name: '',
      notes: '',
    })
    await loadRequests()
  }

  async function updateRequest() {
    if (!selectedRequest) return
    setError(null)
    await fetchApi(`/api/procurement/purchase-requests/${selectedRequest.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: editForm.status,
        requested_quantity: Number(editForm.requested_quantity),
        unit_price: editForm.unit_price ? Number(editForm.unit_price) : undefined,
        supplier_name: editForm.supplier_name || undefined,
      }),
    })
    await loadRequests()
  }

  async function deleteRequest(id: string) {
    if (!confirm('Talep silinsin mi?')) return
    await fetchApi(`/api/procurement/purchase-requests/${id}`, { method: 'DELETE' })
    if (selectedRequest?.id === id) {
      setSelectedRequest(null)
    }
    await loadRequests()
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter
      const search = searchTerm.toLowerCase()
      const matchesSearch =
        !search ||
        request.request_number.toLowerCase().includes(search) ||
        request.material_name?.toLowerCase().includes(search) ||
        request.material_id.toLowerCase().includes(search)
      return matchesStatus && matchesSearch
    })
  }, [requests, statusFilter, searchTerm])

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader title="Satın Alma Talepleri" subtitle="Açık talepler ve yeni talep oluşturma" />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Material ID"
              value={form.material_id}
              onChange={(e) => setForm((prev) => ({ ...prev, material_id: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Miktar"
              value={form.requested_quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, requested_quantity: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Birim Fiyat"
              value={form.unit_price}
              onChange={(e) => setForm((prev) => ({ ...prev, unit_price: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Tedarikçi"
              value={form.supplier_name}
              onChange={(e) => setForm((prev) => ({ ...prev, supplier_name: e.target.value }))}
            />
            <Button
              onClick={createRequest}
              disabled={loading || !form.material_id.trim() || !form.requested_quantity.trim()}
            >
              Talep Ekle
            </Button>
          </div>
          <input
            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
            placeholder="Notlar"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Ara (talep no / malzeme)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tüm Durumlar</option>
              <option value="draft">Taslak</option>
              <option value="ordered">Sipariş Verildi</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal</option>
            </select>
            <Button variant="outline" onClick={loadRequests} disabled={loading}>
              Yenile
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-2">Talep No</th>
                  <th className="py-2">Malzeme</th>
                  <th className="py-2">Miktar</th>
                  <th className="py-2">Durum</th>
                  <th className="py-2 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr
                    key={request.id}
                    className="border-t border-gray-800 text-gray-200 cursor-pointer hover:bg-gray-800/60"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <td className="py-2">{request.request_number}</td>
                    <td className="py-2">{request.material_name || request.material_id}</td>
                    <td className="py-2">{request.requested_quantity}</td>
                    <td className="py-2">{request.status}</td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedRequest(request)
                        }}
                      >
                        Detay
                      </Button>
                      <Button
                        variant="ghost"
                        color="error"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteRequest(request.id)
                        }}
                      >
                        Sil
                      </Button>
                    </td>
                  </tr>
                ))}
                {!filteredRequests.length && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-400">
                      Talep bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {selectedRequest && (
        <Card className="bg-gray-900 border border-gray-800">
          <CardHeader title="Talep Detayı" subtitle={selectedRequest.request_number} />
          <CardBody className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div>
                <div className="text-xs text-gray-400">Malzeme</div>
                <div className="text-sm text-gray-200">{selectedRequest.material_name || selectedRequest.material_id}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Miktar</div>
                <div className="text-sm text-gray-200">{selectedRequest.requested_quantity}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Durum</div>
                <div className="text-sm text-gray-200">{selectedRequest.status}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Toplam</div>
                <div className="text-sm text-gray-200">{selectedRequest.total_amount ?? 0}</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <select
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                value={editForm.status}
                onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="draft">Taslak</option>
                <option value="ordered">Sipariş Verildi</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal</option>
              </select>
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="Miktar"
                value={editForm.requested_quantity}
                onChange={(e) => setEditForm((prev) => ({ ...prev, requested_quantity: e.target.value }))}
              />
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="Birim Fiyat"
                value={editForm.unit_price}
                onChange={(e) => setEditForm((prev) => ({ ...prev, unit_price: e.target.value }))}
              />
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="Tedarikçi"
                value={editForm.supplier_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, supplier_name: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={updateRequest} disabled={loading}>
                Güncelle
              </Button>
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Kapat
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
