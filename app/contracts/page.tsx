'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { FileSignature, Plus, Search, Trash2, Edit2 } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Modal } from '@/components/ui/modal'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { formatDate } from '@/lib/utils/dateFormat'

type Contract = {
  id: string
  account_id: string
  title: string
  start_date: string | null
  end_date: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  account_name: string | null
  account_code: string | null
  derived_status: 'active' | 'expired'
}

type Account = { id: string; code: string; name: string }

const DAYS_WARNING = 30

function daysUntil(endDate: string): number | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function ContractsPage() {
  const [list, setList] = useState<Contract[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [accountFilter, setAccountFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    account_id: '',
    title: '',
    start_date: '',
    end_date: '',
    notes: '',
  })

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (accountFilter) params.set('account_id', accountFilter)
      if (statusFilter) params.set('status', statusFilter)
      const data = await fetchApi<Contract[]>(`/api/contracts?${params.toString()}`)
      setList(Array.isArray(data) ? data : [])
    } catch (e: any) {
      toast.error(e?.message || 'Liste yüklenemedi')
      setList([])
    } finally {
      setLoading(false)
    }
  }, [accountFilter, statusFilter])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    fetchApi<Account[] | { data?: Account[] }>('/api/accounts?limit=500')
      .then((res) => {
        const arr = Array.isArray(res) ? res : (res as { data?: Account[] })?.data
        setAccounts(Array.isArray(arr) ? arr : [])
      })
      .catch(() => setAccounts([]))
  }, [])

  const filteredList = search.trim()
    ? list.filter(
        (c) =>
          (c.title || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.account_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : list

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.account_id || !form.title.trim() || !form.end_date) {
      toast.error('Cari, başlık ve bitiş tarihi gerekli')
      return
    }
    try {
      if (editingId) {
        const res = await fetch(`/api/contracts/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: form.title.trim(),
            start_date: form.start_date || null,
            end_date: form.end_date,
            notes: form.notes.trim() || null,
          }),
        })
        if (!res.ok) throw new Error('Güncellenemedi')
        toast.success('Sözleşme güncellendi')
      } else {
        await fetchApi('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account_id: form.account_id,
            title: form.title.trim(),
            start_date: form.start_date || null,
            end_date: form.end_date,
            notes: form.notes.trim() || null,
          }),
        })
        toast.success('Sözleşme eklendi')
      }
      setShowModal(false)
      setEditingId(null)
      setForm({ account_id: '', title: '', start_date: '', end_date: '', notes: '' })
      loadList()
    } catch (e: any) {
      toast.error(e?.message || 'İşlem başarısız')
    }
  }

  function openEdit(c: Contract) {
    setEditingId(c.id)
    setForm({
      account_id: c.account_id,
      title: c.title,
      start_date: c.start_date || '',
      end_date: c.end_date,
      notes: c.notes || '',
    })
    setShowModal(true)
  }

  function openNew() {
    setEditingId(null)
    setForm({
      account_id: accountFilter || '',
      title: '',
      start_date: '',
      end_date: '',
      notes: '',
    })
    setShowModal(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu sözleşmeyi silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Silinemedi')
      toast.success('Silindi')
      loadList()
    } catch {
      toast.error('Silme hatası')
    }
  }

  return (
    <AppDashboardLayout
      title="Sözleşme Yönetimi"
      subtitle="Cari hesaba bağlı sözleşmeler, bitiş tarihi ve uyarılar"
      icon={FileSignature}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Sözleşmeler</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Başlık veya cari ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-48 bg-gray-800 pl-8 text-white"
                />
              </div>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white"
              >
                <option value="">Tüm cariler</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} – {a.name}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white"
              >
                <option value="">Tümü</option>
                <option value="active">Aktif</option>
                <option value="expired">Süresi dolmuş</option>
              </select>
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                Yeni sözleşme
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <p className="text-gray-400">Yükleniyor…</p>
            ) : filteredList.length === 0 ? (
              <p className="text-gray-400">Sözleşme bulunamadı. Yeni sözleşme ekleyebilirsiniz.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400">
                      <th className="pb-2 pr-4">Cari</th>
                      <th className="pb-2 pr-4">Başlık</th>
                      <th className="pb-2 pr-4">Başlangıç</th>
                      <th className="pb-2 pr-4">Bitiş</th>
                      <th className="pb-2 pr-4">Durum / Uyarı</th>
                      <th className="pb-2 pr-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((c) => {
                      const days = daysUntil(c.end_date)
                      const warn = c.derived_status === 'active' && days !== null && days <= DAYS_WARNING && days >= 0
                      const expired = c.derived_status === 'expired'
                      return (
                        <tr key={c.id} className="border-b border-gray-800">
                          <td className="py-2 pr-4">
                            <Link
                              href={`/accounts/${c.account_id}`}
                              className="text-blue-400 hover:underline"
                            >
                              {c.account_code} – {c.account_name || '–'}
                            </Link>
                          </td>
                          <td className="py-2 pr-4 font-medium text-white">{c.title}</td>
                          <td className="py-2 pr-4 text-gray-300">{c.start_date ? formatDate(c.start_date) : '–'}</td>
                          <td className="py-2 pr-4 text-gray-300">{formatDate(c.end_date)}</td>
                          <td className="py-2 pr-4">
                            {expired ? (
                              <span className="rounded bg-red-900/50 px-2 py-0.5 text-red-300">Süresi doldu</span>
                            ) : warn ? (
                              <span className="rounded bg-amber-900/50 px-2 py-0.5 text-amber-300">
                                {days === 0 ? 'Bugün bitiyor' : `${days} gün kala`}
                              </span>
                            ) : (
                              <span className="rounded bg-green-900/30 px-2 py-0.5 text-green-300">Aktif</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className="mr-2 text-blue-400 hover:underline"
                              title="Düzenle"
                            >
                              <Edit2 className="inline h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c.id)}
                              className="text-red-400 hover:underline"
                              title="Sil"
                            >
                              <Trash2 className="inline h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Sözleşmeyi düzenle' : 'Yeni sözleşme'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Cari hesap</label>
            <select
              value={form.account_id}
              onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}
              required
              disabled={!!editingId}
              className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white"
            >
              <option value="">Seçin</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} – {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Başlık</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Örn. Tedarik sözleşmesi 2024"
              required
              className="bg-gray-800 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-400">Başlangıç tarihi</label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="bg-gray-800 text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-400">Bitiş tarihi</label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                required
                className="bg-gray-800 text-white"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Notlar</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              İptal
            </Button>
            <Button type="submit">{editingId ? 'Güncelle' : 'Ekle'}</Button>
          </div>
        </form>
      </Modal>
    </AppDashboardLayout>
  )
}
