'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RotateCcw, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { toast } from '@/lib/notify'

type Account = { id: string; code: string; name: string }
type Product = { id: string; name: string; sku?: string; selling_price?: number }

export default function NewReturnPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Account[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customerId, setCustomerId] = useState('')
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<{ product_id: string; product_name: string; quantity: number; unit_price: number }[]>([{ product_id: '', product_name: '', quantity: 1, unit_price: 0 }])
  const [saving, setSaving] = useState(false)

  useEffect(() => { document.title = 'Yeni İade - LIVASOFA ERP' }, [])

  const loadData = useCallback(async () => {
    try {
      const [cust, prod] = await Promise.all([
        fetchApi<Account[]>('/api/accounts?type=customer&limit=500'),
        fetchApi<Product[]>('/api/products').catch(() => [])
      ])
      setCustomers(Array.isArray(cust) ? cust : [])
      setProducts(Array.isArray(prod) ? prod : [])
    } catch (e) { console.error(e) }
  }, [])
  useEffect(() => { loadData() }, [loadData])

  const addRow = () => setItems(prev => [...prev, { product_id: '', product_name: '', quantity: 1, unit_price: 0 }])
  const removeRow = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: string, value: any) => {
    setItems(prev => prev.map((row, idx) => idx !== i ? row : { ...row, [field]: value }))
    if (field === 'product_id' && value) {
      const p = products.find(x => x.id === value)
      if (p) setItems(prev => prev.map((row, idx) => idx !== i ? row : { ...row, product_name: p.name, unit_price: p.selling_price || 0 }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId) { toast.error('Müşteri seçin'); return }
    const valid = items.filter(i => i.product_id && i.quantity > 0)
    if (valid.length === 0) { toast.error('En az bir ürün ekleyin'); return }
    setSaving(true)
    try {
      const res = await fetchApi<{ id: string; return_number: string }>('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          return_date: returnDate,
          notes: notes || null,
          items: valid.map(i => ({ product_id: i.product_id, product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price }))
        })
      })
      const r = (res as any)
      toast.success(r?.return_number ? `İade ${r.return_number} oluşturuldu` : 'İade oluşturuldu')
      router.push(r?.id ? `/returns` : '/returns')
    } catch (e: any) {
      toast.error(e?.message || 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppDashboardLayout title="Yeni iade" subtitle="Müşteri iadesi (taslak)" icon={RotateCcw}>
      <div className="mb-4">
        <Link href="/returns" className="text-gray-400 hover:text-white inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> İade listesine dön
        </Link>
      </div>
      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader title="Genel" />
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Müşteri *</label>
              <select className="w-full rounded-lg bg-gray-800 border border-gray-600 text-white px-3 py-2" value={customerId} onChange={e => setCustomerId(e.target.value)} required>
                <option value="">Seçin</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">İade tarihi</label>
              <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} fullWidth />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notlar</label>
              <textarea className="w-full rounded-lg bg-gray-800 border border-gray-600 text-white px-3 py-2 min-h-[80px]" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </CardBody>
        </Card>
        <Card className="mb-4">
          <CardHeader title="Kalemler" actions={<Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="w-4 h-4 mr-1" />Kalem ekle</Button>} />
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-left text-gray-400">
                    <th className="py-2 px-2">Ürün</th>
                    <th className="py-2 px-2 w-24">Miktar</th>
                    <th className="py-2 px-2 w-28">Birim fiyat</th>
                    <th className="py-2 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="py-2 px-2">
                        <select className="w-full max-w-[220px] rounded bg-gray-800 border border-gray-600 text-white px-2 py-1" value={row.product_id} onChange={e => updateRow(idx, 'product_id', e.target.value)}>
                          <option value="">Seçin</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.sku || ''} {p.name}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-2"><Input type="number" min={0} step={1} value={row.quantity} onChange={e => updateRow(idx, 'quantity', Number(e.target.value) || 0)} fullWidth /></td>
                      <td className="py-2 px-2"><Input type="number" min={0} step={0.01} value={row.unit_price} onChange={e => updateRow(idx, 'unit_price', Number(e.target.value) || 0)} fullWidth /></td>
                      <td className="py-2 px-2"><Button type="button" variant="ghost" size="sm" className="text-red-400" onClick={() => removeRow(idx)} disabled={items.length <= 1}><Trash2 className="w-4 h-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
        <div className="flex gap-2">
          <Button type="submit" variant="solid" color="primary" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Taslak kaydet'}</Button>
          <Link href="/returns"><Button type="button" variant="outline">İptal</Button></Link>
        </div>
      </form>
    </AppDashboardLayout>
  )
}
