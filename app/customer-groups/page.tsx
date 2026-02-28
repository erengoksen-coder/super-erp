'use client'

import { useCallback, useEffect, useState } from 'react'
import { Users, Plus, Pencil, Trash2 } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { toast } from '@/lib/notify'

type Group = { id: string; name: string; code: string | null; description: string | null }

export default function CustomerGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { document.title = 'Müşteri Grupları - LIVASOFA ERP' }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchApi<Group[]>('/api/customer-groups')
      setGroups(Array.isArray(data) ? data : [])
    } catch (e) { console.error(e); toast.error('Liste yüklenemedi') } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const startEdit = (g: Group) => {
    setEditingId(g.id)
    setFormName(g.name)
    setFormCode(g.code || '')
    setFormDesc(g.description || '')
    setShowNew(false)
  }

  const startNew = () => {
    setEditingId(null)
    setFormName('')
    setFormCode('')
    setFormDesc('')
    setShowNew(true)
  }

  const saveEdit = async () => {
    if (!formName.trim()) { toast.error('Grup adı girin'); return }
    setSaving(true)
    try {
      if (editingId) {
        await fetchApi(`/api/customer-groups/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: formName.trim(), code: formCode.trim() || null, description: formDesc.trim() || null }) })
        toast.success('Güncellendi')
      } else {
        await fetchApi('/api/customer-groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: formName.trim(), code: formCode.trim() || null, description: formDesc.trim() || null }) })
        toast.success('Grup eklendi')
      }
      setEditingId(null)
      setShowNew(false)
      load()
    } catch (e: any) { toast.error(e?.message || 'Kayıt başarısız') } finally { setSaving(false) }
  }

  const deleteGroup = async (id: string) => {
    if (!confirm('Bu grubu silmek istediğinize emin misiniz?')) return
    try {
      await fetchApi(`/api/customer-groups/${id}`, { method: 'DELETE' })
      toast.success('Silindi')
      load()
    } catch (e: any) { toast.error(e?.message || 'Silinemedi') }
  }

  return (
    <AppDashboardLayout title="Müşteri Grupları" subtitle="Çoklu fiyat listesi için müşteri grupları" icon={Users}>
      <Card className="mb-4">
        <CardHeader title="Grup ekle / düzenle" actions={<Button variant="outline" size="sm" onClick={startNew}><Plus className="w-4 h-4 mr-1" />Yeni grup</Button>} />
        <CardBody>
          {(showNew || editingId) && (
            <div className="flex flex-wrap items-end gap-4 mb-4 p-4 rounded-lg bg-gray-800/50">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Grup adı *</label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Örn. Perakende" className="w-48" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Kod</label>
                <Input value={formCode} onChange={e => setFormCode(e.target.value)} placeholder="Örn. GRP-01" className="w-32" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Açıklama</label>
                <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Opsiyonel" className="w-64" />
              </div>
              <Button size="sm" variant="solid" color="primary" onClick={saveEdit} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowNew(false); setEditingId(null) }}>İptal</Button>
            </div>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={`Müşteri grupları (${groups.length})`} />
        <CardBody>
          {loading ? <div className="py-8 text-center text-gray-400">Yükleniyor...</div> :
            groups.length === 0 ? <div className="py-8 text-center text-gray-500">Henüz grup yok. &quot;Yeni grup&quot; ile ekleyin.</div> :
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-left text-gray-400">
                      <th className="py-3 px-3">Kod</th>
                      <th className="py-3 px-3">Ad</th>
                      <th className="py-3 px-3">Açıklama</th>
                      <th className="py-3 px-3 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(g => (
                      <tr key={g.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                        <td className="py-3 px-3 font-mono text-gray-300">{g.code || '-'}</td>
                        <td className="py-3 px-3 text-white font-medium">{g.name}</td>
                        <td className="py-3 px-3 text-gray-400 text-xs">{g.description || '-'}</td>
                        <td className="py-3 px-3 text-right">
                          <Button variant="ghost" size="sm" className="text-blue-400 mr-1" onClick={() => startEdit(g)}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-400" onClick={() => deleteGroup(g.id)}><Trash2 className="w-3 h-3" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
        </CardBody>
      </Card>
    </AppDashboardLayout>
  )
}
