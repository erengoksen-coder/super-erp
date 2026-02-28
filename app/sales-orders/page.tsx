'use client'

import { useMemo, useState, useRef } from 'react'
import { Plus, X, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { LogoWithBackground } from '@/components/Logo'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { fetchApi, useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { formatDate } from '@/lib/utils/dateFormat'

type Account = {
  id: string
  code?: string
  name: string
}

type Product = {
  id: string
  name: string
  sku?: string | null
  price?: number | null
}

type SalesOrder = {
  id: string
  order_number?: string | null
  order_date?: string | null
  status?: string | null
  total_amount?: number | null
  final_amount?: number | null
  customer_name?: string | null
  total_items?: number | null
}

type ItemForm = {
  product_id: string
  quantity: string
  unit_price: string
}

const DURUM_ETIKETLERI: Record<string, string> = {
  pending: 'Beklemede',
  in_production: 'Üretimde',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  confirmed: 'Onaylandı',
  reclamation: 'Reklamede',
  in_reclamation: 'Reklamede',
  reklamede: 'Reklamede'
}

export default function SalesOrdersPage() {
  const { data: ordersData, isLoading, mutate } = useApi<SalesOrder[]>('/api/sales-orders')
  const { data: customersData } = useApi<Account[]>('/api/accounts?type=customer')
  const { data: productsData } = useApi<Product[]>('/api/products')

  const rawOrders = useMemo(() => ordersData ?? [], [ordersData])
  const customers = useMemo(() => customersData ?? [], [customersData])
  const products = useMemo(() => productsData ?? [], [productsData])

  type SortKey = 'order_number' | 'order_date' | 'customer_name' | 'total_items' | 'total_amount' | 'status'
  const [sortKey, setSortKey] = useState<SortKey>('order_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const orders = useMemo(() => {
    const list = [...rawOrders]
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'order_date') {
        const da = (a.order_date || '').toString()
        const db = (b.order_date || '').toString()
        cmp = da.localeCompare(db)
      } else if (sortKey === 'order_number') {
        cmp = (a.order_number || '').toString().localeCompare((b.order_number || '').toString())
      } else if (sortKey === 'customer_name') {
        cmp = (a.customer_name || '').localeCompare(b.customer_name || '')
      } else if (sortKey === 'total_items') {
        cmp = (a.total_items ?? 0) - (b.total_items ?? 0)
      } else if (sortKey === 'total_amount' || sortKey === 'status') {
        const amtA = Number(a.total_amount ?? a.final_amount ?? 0)
        const amtB = Number(b.total_amount ?? b.final_amount ?? 0)
        cmp = sortKey === 'total_amount' ? amtA - amtB : (a.status || '').localeCompare(b.status || '')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [rawOrders, sortKey, sortDir])

  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const salesOrderFormRef = useRef<HTMLFormElement>(null)
  useKeyboardShortcut('Escape', () => setShowModal(false))
  useKeyboardShortcut('n', () => { if (!showModal) setShowModal(true) }, { ctrlOrMeta: true })
  useKeyboardShortcut('s', () => { if (showModal && salesOrderFormRef.current) salesOrderFormRef.current.requestSubmit() }, { ctrlOrMeta: true, enabled: showModal })
  const [form, setForm] = useState({
    customer_id: '',
    order_date: '',
    status: 'pending',
    payment_terms_days: '',
    notes: '',
    items: [{ product_id: '', quantity: '', unit_price: '' }] as ItemForm[]
  })

  const totalAmount = form.items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0
    const price = parseFloat(item.unit_price) || 0
    return sum + qty * price
  }, 0)

  function handleItemChange(index: number, field: keyof ItemForm, value: string) {
    setForm((prev) => {
      const items = prev.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        const nextItem = { ...item, [field]: value }
        if (field === 'product_id') {
          const product = products.find((p) => p.id === value)
          if (product && !nextItem.unit_price) {
            nextItem.unit_price = String(product.price ?? '')
          }
        }
        return nextItem
      })
      return { ...prev, items }
    })
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: '', unit_price: '' }]
    }))
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index)
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validItems = form.items.filter((item) => item.product_id && item.quantity && item.unit_price)
    if (!form.customer_id) {
      toast.warning('Müşteri seçilmelidir')
      return
    }
    if (validItems.length === 0) {
      toast.warning('En az bir ürün eklemelisiniz')
      return
    }
    setSaving(true)
    try {
      await fetchApi('/api/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: form.customer_id,
          order_date: form.order_date || null,
          status: form.status || 'pending',
          payment_terms_days: form.payment_terms_days ? Number(form.payment_terms_days) : null,
          notes: form.notes || null,
          items: validItems.map((item) => ({
            product_id: item.product_id,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price)
          }))
        })
      })
      setForm({
        customer_id: '',
        order_date: '',
        status: 'pending',
        payment_terms_days: '',
        notes: '',
        items: [{ product_id: '', quantity: '', unit_price: '' }]
      })
      setShowModal(false)
      await mutate()
      toast.success('Satış siparişi kaydedildi')
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white flex items-center space-x-2">
            <ClipboardList className="w-6 h-6 md:w-8 md:h-8" />
            <span>Satış Siparişleri</span>
          </h1>
          <LogoWithBackground size="sm" />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Sipariş</span>
        </button>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        {!isLoading && orders.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Henüz satış siparişi yok"
              description="Müşteri siparişlerini burada oluşturup takip edebilirsiniz."
              icon={ClipboardList}
              action={
                <Button variant="solid" color="primary" size="sm" onClick={() => setShowModal(true)} className="inline-flex items-center gap-2">
                  <Plus size={18} />
                  İlk satış siparişini oluştur
                </Button>
              }
            />
          </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800">
              {(['order_number', 'order_date', 'customer_name', 'total_items', 'total_amount', 'status'] as const).map((key) => (
                <TableHead
                  key={key}
                  className="h-8 px-4 py-2 text-xs cursor-pointer select-none hover:bg-gray-800/50"
                  onClick={() => {
                    setSortKey(key)
                    setSortDir((d) => (sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'desc'))
                  }}
                >
                  <span className="inline-flex items-center">
                    {{ order_number: 'Sipariş No', order_date: 'Tarih', customer_name: 'Müşteri', total_items: 'Kalem', total_amount: 'Tutar', status: 'Durum' }[key]}
                    {sortKey === key && (sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5 ml-0.5" /> : <ChevronUp className="w-3.5 h-3.5 ml-0.5" />)}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-gray-800/50">
                  <TableCell className="text-white text-xs px-4 py-2">
                    {order.order_number || '-'}
                  </TableCell>
                  <TableCell className="text-gray-300 text-xs px-4 py-2">
                    {formatDate(order.order_date)}
                  </TableCell>
                  <TableCell className="text-gray-200 text-xs px-4 py-2">
                    {order.customer_name || '-'}
                  </TableCell>
                  <TableCell className="text-gray-300 text-xs px-4 py-2">
                    {order.total_items ?? 0}
                  </TableCell>
                  <TableCell className="text-gray-200 text-xs px-4 py-2 font-semibold">
                    ₺{Number(order.total_amount ?? order.final_amount ?? 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-gray-300 text-xs px-4 py-2">
                    {DURUM_ETIKETLERI[order.status || 'pending'] ?? order.status}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Yeni Satış Siparişi</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form ref={salesOrderFormRef} onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Müşteri <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.customer_id}
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Müşteri seçin</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.code ? `${customer.code} - ` : ''}{customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Sipariş Tarihi</label>
                  <input
                    type="date"
                    value={form.order_date}
                    onChange={(e) => setForm({ ...form, order_date: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Vade (Gün)</label>
                  <input
                    type="number"
                    value={form.payment_terms_days}
                    onChange={(e) => setForm({ ...form, payment_terms_days: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Durum</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="pending">Beklemede</option>
                    <option value="confirmed">Onaylandı</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="cancelled">İptal</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-300">Kalemler</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    + Kalem Ekle
                  </button>
                </div>
                {form.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <select
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Ürün seçin</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.sku ? `${product.sku} - ` : ''}{product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        placeholder="Miktar"
                        required
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        placeholder="Birim Fiyat"
                        required
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-1">
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="w-full px-3 py-2 bg-red-900/40 text-red-300 rounded-lg hover:bg-red-900/60"
                        >
                          <X className="w-4 h-4 mx-auto" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="text-right text-sm text-gray-300">
                  Toplam: <span className="font-semibold text-white">₺{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notlar</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : 'Sipariş Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
