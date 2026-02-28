'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { toast } from '@/lib/notify'

type Account = { id: string; code: string; name: string }
type Product = { id: string; name: string; sku?: string; selling_price?: number }

export default function NewQuotationPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Account[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customerId, setCustomerId] = useState('')
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [discountRate, setDiscountRate] = useState(0)
  const [taxRate, setTaxRate] = useState(20)
  const [items, setItems] = useState<{ product_id: string; product_name: string; product_sku: string; quantity: number; unit: string; unit_price: number }[]>([{ product_id: '', product_name: '', product_sku: '', quantity: 1, unit: 'ADET', unit_price: 0 }])
  const [saving, setSaving] = useState(false)

  useEffect(() => { document.title = 'Yeni Teklif - LIVASOFA ERP' }, [])

  const loadData = useCallback(async () => {
    try {
      const [custData, prodData] = await Promise.all([
        fetchApi<Account[] | { data?: Account[] }>('/api/accounts?type=customer&limit=500'),
        fetchApi<Product[] | { data?: Product[] }>('/api/products').catch(() => fetchApi('/api/inventory/products').catch(() => []))
      ])
      setCustomers(Array.isArray(custData) ? custData : (custData as any)?.data || [])
      setProducts(Array.isArray(prodData) ? prodData : (prodData as any)?.data || [])
    } catch (e) { console.error(e); toast.error('Veriler yüklenemedi') }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const addRow = () => setItems(prev => [...prev, { product_id: '', product_name: '', product_sku: '', quantity: 1, unit: 'ADET', unit_price: 0 }])
  const removeRow = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))
  const updateRow = (idx: number, field: string, value: any) => {
    setItems(prev => prev.map((row, i) => i !== idx ? row : { ...row, [field]: value }))
    if (field === 'product_id' && value) {
      const p = products.find(pr => pr.id === value)
      if (p) {
        setItems(prev => prev.map((row, i) => i !== idx ? row : {
          ...row,
          product_name: p.name,
          product_sku: p.sku || '',
          unit_price: p.selling_price || 0
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId) { toast.error('Müşteri seçin'); return }
    const validItems = items.filter(i => (i.product_id || i.product_name) && (i.quantity || 0) > 0)
    if (validItems.length === 0) { toast.error('En az bir kalem ekleyin'); return }
    setSaving(true)
    try {
      const payload = {
        customer_id: customerId,
        quotation_date: quotationDate,
        valid_until: validUntil || null,
        notes: notes || null,
        terms: terms || null,
        discount_rate: discountRate,
        tax_rate: taxRate,
        items: validItems.map(i => ({ product_id: i.product_id || null, product_name: i.product_name, product_sku: i.product_sku || null, quantity: i.quantity, unit: i.unit, unit_price: i.unit_price }))
      }
      const res = await fetchApi<{ quotation?: { id: string; quotation_number: string } }>('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const q = (res as any)?.quotation
      toast.success(q ? `Teklif ${q.quotation_number} oluşturuldu` : 'Teklif oluşturuldu')
      router.push(q?.id ? `/quotations` : '/quotations')
    } catch (e: any) {
      toast.error(e?.message || 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppDashboardLayout title="Yeni Teklif" subtitle="Teklif / Proforma oluştur" icon={FileText}>
      <div className="mb-4">
        <Link href="/quotations" className="text-gray-400 hover:text-white inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Teklif listesine dön
        </Link>
      </div>
      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader title="Genel bilgiler" />
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Müşteri *</label>
              <select
                className="w-full rounded-lg bg-gray-800 border border-gray-600 text-white px-3 py-2"
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                required
              >
                <option value="">Seçin</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Teklif tarihi</label>
                <Input type="date" value={quotationDate} onChange={e => setQuotationDate(e.target.value)} fullWidth />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Geçerlilik tarihi</label>
                <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} fullWidth />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notlar</label>
              <textarea className="w-full rounded-lg bg-gray-800 border border-gray-600 text-white px-3 py-2 min-h-[80px]" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Şartlar</label>
              <textarea className="w-full rounded-lg bg-gray-800 border border-gray-600 text-white px-3 py-2 min-h-[60px]" value={terms} onChange={e => setTerms(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">İndirim %</label>
                <Input type="number" min={0} max={100} step={0.01} value={discountRate} onChange={e => setDiscountRate(Number(e.target.value) || 0)} fullWidth />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">KDV %</label>
                <Input type="number" min={0} max={100} step={0.01} value={taxRate} onChange={e => setTaxRate(Number(e.target.value) || 20)} fullWidth />
              </div>
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
                    <th className="py-2 px-2 w-24">Birim</th>
                    <th className="py-2 px-2 w-28">Birim fiyat</th>
                    <th className="py-2 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-800">
                      <td className="py-2 px-2">
                        <select
                          className="w-full max-w-[220px] rounded bg-gray-800 border border-gray-600 text-white px-2 py-1"
                          value={row.product_id}
                          onChange={e => updateRow(idx, 'product_id', e.target.value)}
                        >
                          <option value="">Serbest giriş / Ürün seçin</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.sku || ''} {p.name}</option>)}
                        </select>
                        {!row.product_id && (
                          <Input
                            className="mt-1 max-w-[220px]"
                            placeholder="Ürün adı"
                            value={row.product_name}
                            onChange={e => updateRow(idx, 'product_name', e.target.value)}
                          />
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <Input type="number" min={0} step={1} value={row.quantity} onChange={e => updateRow(idx, 'quantity', Number(e.target.value) || 0)} fullWidth />
                      </td>
                      <td className="py-2 px-2">
                        <Input value={row.unit} onChange={e => updateRow(idx, 'unit', e.target.value)} fullWidth />
                      </td>
                      <td className="py-2 px-2">
                        <Input type="number" min={0} step={0.01} value={row.unit_price} onChange={e => updateRow(idx, 'unit_price', Number(e.target.value) || 0)} fullWidth />
                      </td>
                      <td className="py-2 px-2">
                        <Button type="button" variant="ghost" size="sm" className="text-red-400" onClick={() => removeRow(idx)} disabled={items.length <= 1}><Trash2 className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
        <div className="flex gap-2">
          <Button type="submit" variant="solid" color="primary" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Teklif oluştur'}</Button>
          <Link href="/quotations"><Button type="button" variant="outline">İptal</Button></Link>
        </div>
      </form>
    </AppDashboardLayout>
  )
}
