'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PlusCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'

type Product = { id: string; name: string; sku: string }

function getOrderDateLocal() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

export default function BayiOrderNewPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dealerName, setDealerName] = useState('')
  const [form, setForm] = useState({
    product_id: '' as string,
    product_name: '',
    product_sku: '',
    quantity: 1,
    unit_price: 0,
    customer_name: '',
    order_date: getOrderDateLocal(),
    configuration: '',
    notes: '',
    fabric_code: '',
    case_info: '',
    leg_info: '',
    cushion_info: '',
    unit: '',
  })

  // Sadece BOM'a kayıtlı ürünler
  useEffect(() => {
    fetchApi<unknown>('/api/products?has_bom=1')
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data?.data ?? [])
        setProducts((list as Product[]).filter((p) => p.id && (p.name || p.sku)))
      })
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false))
  }, [])

  // Cari (bayi) adı: hangi bayi portalı açıksa otomatik girsin
  useEffect(() => {
    const fromUser = (user as any)?.dealer_name ?? ''
    if (fromUser) {
      setDealerName(String(fromUser).trim())
      setForm((prev) => ({ ...prev, customer_name: prev.customer_name || String(fromUser).trim() }))
      return
    }
    fetchApi('/api/bayi/me')
      .then((res: any) => {
        const u = res?.user ?? res?.data?.user
        const name = (u?.dealer_name ?? '').trim()
        setDealerName(name)
        setForm((prev) => ({ ...prev, customer_name: prev.customer_name || name }))
      })
      .catch(() => setDealerName(''))
  }, [user])

  const selectedProduct = products.find((p) => p.id === form.product_id || p.sku === form.product_sku)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.product_id && !form.product_sku && !form.product_name?.trim()) {
      toast.error('Ürün seçin veya ürün adı/SKU girin.')
      return
    }
    if (!form.quantity || form.quantity < 1) {
      toast.error('Miktar en az 1 olmalıdır.')
      return
    }
    if (!form.fabric_code?.trim()) {
      toast.error('Kumaş kodu zorunludur.')
      return
    }
    setSubmitting(true)
    try {
      const orderPayload = {
        product_id: form.product_id || null,
        product_sku: form.product_sku?.trim() || null,
        product_name: form.product_name?.trim() || (selectedProduct?.name ?? ''),
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price) || 0,
        customer_name: form.customer_name?.trim() || null,
        customer_code: null,
        order_date: form.order_date?.trim() || null,
        configuration: form.configuration?.trim() || null,
        notes: form.notes?.trim() || null,
        fabric_code: form.fabric_code?.trim() || null,
        case_info: (form.case_info?.trim() || 'katalok'),
        leg_info: (form.leg_info?.trim() || 'katalok'),
        cushion_info: (form.cushion_info?.trim() || 'katalok'),
        unit: form.unit?.trim() || null,
      }
      const res = await fetchApi('/api/bayi/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: [orderPayload] }),
      })
      const data = (res as any)?.data ?? res
      const created = data?.orders ?? []
      if (created.length > 0) {
        toast.success(`${created.length} sipariş oluşturuldu.`)
        router.push('/bayi/orders')
      } else {
        toast.error('Sipariş oluşturulamadı.')
      }
    } catch (err: any) {
      const msg = err?.message || 'Sipariş gönderilirken hata oluştu.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <PlusCircle className="w-5 h-5" />
          Sipariş Gir
        </h2>
        <Link
          href="/bayi/orders"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Siparişlerime dön
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 space-y-4">
        {/* 1. Cari | Sipariş tarihi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Cari (Bayi) *</label>
            <input
              type="text"
              value={dealerName}
              readOnly
              className="w-full px-3 py-2 rounded-lg bg-slate-700/60 border border-slate-600 text-slate-300 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Sipariş tarihi</label>
            <input
              type="datetime-local"
              value={form.order_date}
              onChange={(e) => setForm((prev) => ({ ...prev, order_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 2. Müşteri adı */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Müşteri adı (Satın Alan Müşteri)</label>
            <input
              type="text"
              value={form.customer_name}
              onChange={(e) => setForm((prev) => ({ ...prev, customer_name: e.target.value }))}
              placeholder="Son kullanıcı / müşteri"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div />
        </div>

        {/* 3. Ürün * | SKU’*/}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Ürün *</label>
            {loadingProducts ? (
              <p className="text-slate-500 text-sm">Ürünler yükleniyor...</p>
            ) : (
              <select
              value={form.product_id || form.product_sku || ''}
              onChange={(e) => {
                const v = e.target.value
                const p = products.find((x) => x.id === v || x.sku === v)
                setForm((prev) => ({
                  ...prev,
                  product_id: p?.id ?? '',
                  product_sku: p?.sku ?? '',
                  product_name: p?.name ?? '',
                }))
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Ürün seçin</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} – {p.name}
                </option>
              ))}
            </select>
          )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">SKU / Ürün Kodu</label>
            <input
              type="text"
              value={form.product_sku}
              readOnly
              className="w-full px-3 py-2 rounded-lg bg-slate-700/60 border border-slate-600 text-slate-400 cursor-not-allowed"
              placeholder="Ürün seçince otomatik"
            />
          </div>
        </div>

        {/* 4. SİP MİKTAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">SİP MİKTAR (Miktar) *</label>
            <input
              type="number"
              min={1}
              value={form.quantity === 0 ? '' : form.quantity}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') {
                  setForm((prev) => ({ ...prev, quantity: 0 }))
                  return
                }
                const num = parseInt(raw, 10)
                if (!Number.isNaN(num) && num >= 0) {
                  setForm((prev) => ({ ...prev, quantity: num }))
                }
              }}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div />
        </div>

        {/* 5. KONFİGÜRASYON | KASA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">KONFİGÜRASYON</label>
            <input
              type="text"
              value={form.configuration}
              onChange={(e) => setForm((prev) => ({ ...prev, configuration: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">KASA <span className="text-slate-500 font-normal">(boş = katalok)</span></label>
            <input
              type="text"
              value={form.case_info}
              onChange={(e) => setForm((prev) => ({ ...prev, case_info: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Boş bırakılırsa katalok"
            />
          </div>
        </div>

        {/* 6. KUMAŞ KODU * | AYAK (boş = katalok) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">KUMAŞ KODU *</label>
            <input
              type="text"
              value={form.fabric_code}
              onChange={(e) => setForm((prev) => ({ ...prev, fabric_code: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Hammadde depoda kayıtlı olmalı"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">AYAK <span className="text-slate-500 font-normal">(boş = katalok)</span></label>
            <input
              type="text"
              value={form.leg_info}
              onChange={(e) => setForm((prev) => ({ ...prev, leg_info: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Boş bırakılırsa katalok"
            />
          </div>
        </div>

        {/* AÇIKLAMA (Notlar) */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">AÇIKLAMA (Notlar)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || loadingProducts}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Gönderiliyor...' : 'Siparişi gönder'}
          </button>
          <Link
            href="/bayi/orders"
            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            İptal
          </Link>
        </div>
      </form>
    </div>
  )
}
