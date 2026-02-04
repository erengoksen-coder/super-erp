'use client'

import { useEffect, useState } from 'react'
import { Plus, MapPin } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { fetchApi } from '@/lib/api/client'

type WorkCenter = {
  id: string
  code: string | null
  name: string
  location: string | null
  capacity: number | null
  is_active: number
}

export default function WorkCentersPage() {
  const [centers, setCenters] = useState<WorkCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    code: '',
    name: '',
    location: '',
    capacity: '1',
  })

  useEffect(() => {
    loadCenters()
  }, [])

  async function loadCenters() {
    setLoading(true)
    try {
      const data = await fetchApi('/api/work-centers')
      setCenters(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('İstasyonlar yüklenemedi:', error)
      setCenters([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      alert('İstasyon adı zorunludur')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await fetchApi('/api/work-centers', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            code: form.code || null,
            name: form.name,
            location: form.location || null,
            capacity: Number(form.capacity) || 1,
          }),
        })
      } else {
        await fetchApi('/api/work-centers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: form.code || null,
            name: form.name,
            location: form.location || null,
            capacity: Number(form.capacity) || 1,
          }),
        })
      }
      setForm({ code: '', name: '', location: '', capacity: '1' })
      setEditingId(null)
      await loadCenters()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(center: WorkCenter) {
    setEditingId(center.id)
    setForm({
      code: center.code || '',
      name: center.name || '',
      location: center.location || '',
      capacity: String(center.capacity ?? 1),
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('İstasyon silinsin mi?')) return
    try {
      await fetchApi(`/api/work-centers?id=${id}`, { method: 'DELETE' })
      if (editingId === id) {
        setEditingId(null)
        setForm({ code: '', name: '', location: '', capacity: '1' })
      }
      await loadCenters()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-2">
            <MapPin className="w-8 h-8" />
            <span>İstasyonlar</span>
          </h1>
          <p className="text-gray-400">Makine parkuru ve atölye alanlarını yönetin.</p>
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
              placeholder="WC-01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">İstasyon Adı *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="Döşeme Atölyesi"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Lokasyon</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="Atölye 1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Kapasite</label>
            <input
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
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
            <span>{saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'İstasyon Ekle'}</span>
          </button>
        </div>
      </form>

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800">
              <TableHead className="h-8">Kod</TableHead>
              <TableHead className="h-8">İstasyon</TableHead>
              <TableHead className="h-8">Lokasyon</TableHead>
              <TableHead className="h-8 text-right">Kapasite</TableHead>
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
            ) : centers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 text-xs py-8">
                  İstasyon kaydı bulunamadı
                </TableCell>
              </TableRow>
            ) : (
              centers.map((center) => (
                <TableRow key={center.id}>
                  <TableCell className="text-white text-xs">{center.code || '-'}</TableCell>
                  <TableCell className="text-white text-xs">{center.name}</TableCell>
                  <TableCell className="text-gray-400 text-xs">{center.location || '-'}</TableCell>
                  <TableCell className="text-right text-white text-xs">
                    {center.capacity || 1}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startEdit(center)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDelete(center.id)}
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
