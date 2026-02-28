'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Webhook,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
} from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import { isAdminRole } from '@/lib/auth/permissions-check'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { toast } from '@/lib/notify'

type WebhookEndpoint = {
  id: string
  url: string
  events: string | null
  description: string | null
  active: number
  created_at: string
}

const EVENT_OPTIONS = [
  'order.created',
  'order.updated',
  'shipment.approved',
  'shipment.created',
  'invoice.issued',
  'stock.low',
  'production.started',
  'production.completed',
]

export default function AdminWebhooksPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [list, setList] = useState<WebhookEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ url: '', events: '', secret: '', description: '' })

  const isAdmin = isAdminRole(user?.role)

  useEffect(() => {
    if (!user) return
    if (!isAdmin) {
      const t = setTimeout(() => router.replace('/'), 0)
      return () => clearTimeout(t)
    }
    load()
  }, [user, isAdmin, router])

  async function load() {
    setLoading(true)
    try {
      const res = await fetchApi<WebhookEndpoint[]>('/api/webhooks')
      const data = Array.isArray(res) ? res : (res as { data?: WebhookEndpoint[] })?.data ?? []
      setList(data)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setForm({ url: '', events: '', secret: '', description: '' })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(item: WebhookEndpoint) {
    setForm({
      url: item.url,
      events: item.events || '',
      secret: '',
      description: item.description || '',
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.url.trim()) {
      toast.error('URL gerekli')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        const body: Record<string, string> = { url: form.url.trim(), events: form.events.trim(), description: form.description.trim() }
        if (form.secret) body.secret = form.secret.trim()
        await fetchApi(`/api/webhooks/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        toast.success('Webhook güncellendi')
      } else {
        await fetchApi('/api/webhooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: form.url.trim(),
            events: form.events.trim() || undefined,
            secret: form.secret.trim() || undefined,
            description: form.description.trim() || undefined,
          }),
        })
        toast.success('Webhook eklendi')
      }
      setShowForm(false)
      load()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'İşlem başarısız'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(item: WebhookEndpoint) {
    try {
      await fetchApi(`/api/webhooks/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: item.active ? 0 : 1 }),
      })
      toast.success(item.active ? 'Webhook devre dışı bırakıldı' : 'Webhook etkinleştirildi')
      load()
    } catch {
      toast.error('Güncellenemedi')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu webhook\'u silmek istediğinize emin misiniz?')) return
    try {
      await fetchApi(`/api/webhooks/${id}`, { method: 'DELETE' })
      toast.success('Webhook silindi')
      load()
    } catch {
      toast.error('Silinemedi')
    }
  }

  if (!user || !isAdmin) return null

  return (
    <AppDashboardLayout
      title="Webhook'lar"
      subtitle="Olaylar için dış sistemlere POST bildirimi"
      icon={Webhook}
      actions={
        <Button variant="solid" size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Webhook
        </Button>
      }
    >
      <Card>
        <CardHeader title="Kayıtlı Webhook URL'leri" />
        <CardBody>
          {loading ? (
            <LoadingState message="Webhook listesi yükleniyor…" />
          ) : list.length === 0 ? (
            <EmptyState
              title="Henüz webhook yok"
              description="Sipariş, sevkiyat veya stok gibi olaylar tetiklendiğinde kayıtlı URL'lere POST atılır. İlk webhook'u ekleyerek entegrasyonları başlatın."
              icon={Webhook}
              action={
                <Button variant="solid" color="primary" size="sm" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2">
                  <Plus size={18} />
                  İlk webhook ekle
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {list.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-gray-800/50 border border-gray-700"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white truncate">{item.url}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {item.events || 'Tüm olaylar'} {item.description ? ` · ${item.description}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      className={`px-2 py-1 rounded text-xs ${item.active ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'}`}
                    >
                      {item.active ? 'Aktif' : 'Pasif'}
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader
              title={editingId ? 'Webhook düzenle' : 'Yeni webhook'}
              actions={
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              }
            />
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">URL *</label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Olaylar (virgülle ayırın, boş = tümü)</label>
                  <input
                    type="text"
                    value={form.events}
                    onChange={(e) => setForm((f) => ({ ...f, events: e.target.value }))}
                    placeholder="Örn: order.created, shipment.approved"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Örnek: {EVENT_OPTIONS.slice(0, 3).join(', ')} ...
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Gizli anahtar (isteğe bağlı, X-Webhook-Signature başlığı)</label>
                  <input
                    type="password"
                    value={form.secret}
                    onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                    placeholder="••••••"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Açıklama</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Örn: Muhasebe entegrasyonu"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    İptal
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Ekle'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </AppDashboardLayout>
  )
}
