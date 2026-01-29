'use client'

import { useEffect, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { fetchApi } from '@/lib/api/client'

type Personnel = {
  id: string
  full_name: string
  role: string | null
  phone: string | null
  email: string | null
  hourly_rate: number | null
  is_active: number
}

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    role: '',
    phone: '',
    email: '',
    hourly_rate: '0',
  })

  useEffect(() => {
    loadPersonnel()
  }, [])

  async function loadPersonnel() {
    setLoading(true)
    try {
      const data = await fetchApi('/api/personnel')
      setPersonnel(data || [])
    } catch (error) {
      console.error('Personel yüklenemedi:', error)
      setPersonnel([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) {
      alert('Personel adı zorunludur')
      return
    }
    setSaving(true)
    try {
      const payload = {
        full_name: form.full_name,
        role: form.role || null,
        phone: form.phone || null,
        email: form.email || null,
        hourly_rate: Number(form.hourly_rate) || 0,
      }
      if (editingId) {
        await fetchApi('/api/personnel', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        })
      } else {
        await fetchApi('/api/personnel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setForm({ full_name: '', role: '', phone: '', email: '', hourly_rate: '0' })
      setEditingId(null)
      await loadPersonnel()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(item: Personnel) {
    setEditingId(item.id)
    setForm({
      full_name: item.full_name || '',
      role: item.role || '',
      phone: item.phone || '',
      email: item.email || '',
      hourly_rate: String(item.hourly_rate ?? 0),
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Personel silinsin mi?')) return
    try {
      await fetchApi(`/api/personnel?id=${id}`, { method: 'DELETE' })
      if (editingId === id) {
        setEditingId(null)
        setForm({ full_name: '', role: '', phone: '', email: '', hourly_rate: '0' })
      }
      await loadPersonnel()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-2">
            <Users className="w-8 h-8" />
            <span>Personel</span>
          </h1>
          <p className="text-gray-400">Operatörleri ve işçilik maliyetlerini yönetin.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Ad Soyad *</label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="Ahmet Usta"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Rol</label>
            <input
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="Döşeme"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Telefon</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="05xx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">E-posta</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="mail@firma.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Saatlik Ücret</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.hourly_rate}
              onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
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
            <span>{saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Personel Ekle'}</span>
          </button>
        </div>
      </form>

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800">
              <TableHead className="h-8">Ad Soyad</TableHead>
              <TableHead className="h-8">Rol</TableHead>
              <TableHead className="h-8">Telefon</TableHead>
              <TableHead className="h-8">E-posta</TableHead>
              <TableHead className="h-8 text-right">Saatlik Ücret</TableHead>
              <TableHead className="h-8">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 text-xs py-8">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : personnel.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 text-xs py-8">
                  Personel kaydı bulunamadı
                </TableCell>
              </TableRow>
            ) : (
              personnel.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-white text-xs">{item.full_name}</TableCell>
                  <TableCell className="text-gray-400 text-xs">{item.role || '-'}</TableCell>
                  <TableCell className="text-gray-400 text-xs">{item.phone || '-'}</TableCell>
                  <TableCell className="text-gray-400 text-xs">{item.email || '-'}</TableCell>
                  <TableCell className="text-right text-white text-xs">
                    {(item.hourly_rate || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center space-x-2">
                      <button onClick={() => startEdit(item)} className="text-blue-400 hover:text-blue-300">
                        Düzenle
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300">
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
