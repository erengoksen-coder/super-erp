'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Tag, ArrowLeft } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { toast } from '@/lib/notify'

type Group = { id: string; name: string; code: string | null }

export default function NewPriceListPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [customerGroupId, setCustomerGroupId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { document.title = 'Yeni Fiyat Listesi - LIVASOFA ERP' }, [])
  useEffect(() => {
    fetchApi<Group[]>('/api/customer-groups').then(data => setGroups(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Fiyat listesi adı girin'); return }
    setSaving(true)
    try {
      await fetchApi('/api/price-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), code: code.trim() || null, description: description.trim() || null, items: [], customer_group_id: customerGroupId || null })
      })
      toast.success('Fiyat listesi oluşturuldu')
      router.push('/price-lists')
    } catch (e: any) { toast.error(e?.message || 'Oluşturulamadı') } finally { setSaving(false) }
  }

  return (
    <AppDashboardLayout title="Yeni Fiyat Listesi" subtitle="Müşteri grubu bazlı fiyat listesi" icon={Tag}>
      <div className="mb-4">
        <Link href="/price-lists" className="text-gray-400 hover:text-white inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Listeye dön
        </Link>
      </div>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader title="Fiyat listesi bilgileri" />
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ad *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Örn. Perakende Fiyatlar" fullWidth required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Kod</label>
              <Input value={code} onChange={e => setCode(e.target.value)} placeholder="Opsiyonel" fullWidth />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Müşteri grubu</label>
              <select
                className="w-full rounded-lg bg-gray-800 border border-gray-600 text-white px-3 py-2"
                value={customerGroupId}
                onChange={e => setCustomerGroupId(e.target.value)}
              >
                <option value="">Yok (varsayılan liste)</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">Bu listeyi sadece seçili müşteri grubuna uygula. Boş bırakırsanız varsayılan liste olur.</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Açıklama</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} fullWidth />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="solid" color="primary" disabled={saving}>{saving ? 'Oluşturuluyor...' : 'Oluştur'}</Button>
              <Link href="/price-lists"><Button type="button" variant="outline">İptal</Button></Link>
            </div>
          </CardBody>
        </Card>
      </form>
    </AppDashboardLayout>
  )
}
