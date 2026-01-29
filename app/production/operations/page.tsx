'use client'

import { useEffect, useState } from 'react'
import { Plus, Wrench } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { fetchApi } from '@/lib/api/client'

type Operation = {
  id: string
  code: string | null
  name: string
  description: string | null
  standard_duration_minutes: number | null
  is_active: number
}

export default function OperationsPage() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    standard_duration_minutes: '0',
  })

  useEffect(() => {
    loadOperations()
  }, [])

  async function loadOperations() {
    setLoading(true)
    try {
      const data = await fetchApi('/api/operations')
      setOperations(data || [])
    } catch (error) {
      console.error('Operasyonlar yüklenemedi:', error)
      setOperations([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      alert('Operasyon adı zorunludur')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await fetchApi('/api/operations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            code: form.code || null,
            name: form.name,
            description: form.description || null,
            standard_duration_minutes: Number(form.standard_duration_minutes) || 0,
          }),
        })
      } else {
        await fetchApi('/api/operations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: form.code || null,
            name: form.name,
            description: form.description || null,
            standard_duration_minutes: Number(form.standard_duration_minutes) || 0,
          }),
        })
      }
      setForm({ code: '', name: '', description: '', standard_duration_minutes: '0' })
      setEditingId(null)
      await loadOperations()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(operation: Operation) {
    setEditingId(operation.id)
    setForm({
      code: operation.code || '',
      name: operation.name || '',
      description: operation.description || '',
      standard_duration_minutes: String(operation.standard_duration_minutes ?? 0),
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Operasyon silinsin mi?')) return
    try {
      await fetchApi(`/api/operations?id=${id}`, { method: 'DELETE' })
      if (editingId === id) {
        setEditingId(null)
        setForm({ code: '', name: '', description: '', standard_duration_minutes: '0' })
      }
      await loadOperations()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-2">
            <Wrench className="w-8 h-8" />
            <span>Operasyonlar</span>
          </h1>
          <p className="text-gray-400">Kesim, Döşeme, Montaj vb. işlemleri yönetin.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Kod</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="OPS-01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Operasyon Adı *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="Döşeme"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Standart Süre (dk)</label>
            <input
              type="number"
              min="0"
              value={form.standard_duration_minutes}
              onChange={(e) => setForm({ ...form, standard_duration_minutes: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Açıklama</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="İşlem detayları"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center space-x-2 disabled:opacity-50"
          >
            <Plus size={16} />
            <span>{saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Operasyon Ekle'}</span>
          </button>
        </div>
      </form>

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800">
              <TableHead className="h-8">Kod</TableHead>
              <TableHead className="h-8">Operasyon</TableHead>
              <TableHead className="h-8">Açıklama</TableHead>
              <TableHead className="h-8 text-right">Standart Süre</TableHead>
              <TableHead className="h-8">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 text-xs py-8">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : operations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 text-xs py-8">
                  Operasyon kaydı bulunamadı
                </TableCell>
              </TableRow>
            ) : (
              operations.map((operation) => (
                <TableRow key={operation.id}>
                  <TableCell className="text-white text-xs">{operation.code || '-'}</TableCell>
                  <TableCell className="text-white text-xs">{operation.name}</TableCell>
                  <TableCell className="text-gray-400 text-xs">{operation.description || '-'}</TableCell>
                  <TableCell className="text-right text-white text-xs">
                    {(operation.standard_duration_minutes || 0).toLocaleString('tr-TR')} dk
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startEdit(operation)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(operation.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Sil
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
