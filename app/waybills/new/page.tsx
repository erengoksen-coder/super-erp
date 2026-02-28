'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { Button } from '@/components/ui/Button'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Plus, Trash2 } from 'lucide-react'

type Account = { id: string; code: string; name: string }
type Product = { id: string; sku: string; name: string; current_stock: number; safe_stock: number; unit: string }
type LineItem = { product_id: string; product_name: string; product_sku: string; quantity: string; unit: string; notes: string }

export default function NewWaybillPage() {
    const router = useRouter()
    const [loadingCode, setLoadingCode] = useState(false)
    const [saving, setSaving] = useState(false)
    const [customers, setCustomers] = useState<Account[]>([])
    const [products, setProducts] = useState<Product[]>([])

    const [form, setForm] = useState({
        customer_id: '',
        waybill_date: new Date().toISOString().split('T')[0],
        driver_name: '',
        vehicle_plate: '',
        delivery_address: '',
        notes: '',
    })

    const [items, setItems] = useState<LineItem[]>([
        { product_id: '', product_name: '', product_sku: '', quantity: '1', unit: 'ADET', notes: '' },
    ])

    const loadData = useCallback(async () => {
        try {
            const [accData, prodData] = await Promise.all([
                fetchApi<Account[]>('/api/accounts?type=customer'),
                fetchApi<{ products: Product[] }>('/api/products')
            ])

            setCustomers(Array.isArray(accData) ? accData : [])
            setProducts(Array.isArray(prodData?.products) ? prodData.products : [])
        } catch {
            toast.error('Gerekli veriler yüklenemedi')
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    function addLine() {
        setItems((prev) => [...prev, { product_id: '', product_name: '', product_sku: '', quantity: '1', unit: 'ADET', notes: '' }])
    }

    function removeLine(index: number) {
        setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
    }

    function updateLine(index: number, field: keyof LineItem, value: string) {
        setItems((prev) => {
            let next = [...prev]

            // If product changes, auto-fill name, sku, and unit
            if (field === 'product_id') {
                const product = products.find(p => p.id === value)
                if (product) {
                    next[index] = {
                        ...next[index],
                        product_id: value,
                        product_name: product.name,
                        product_sku: product.sku || '',
                        unit: product.unit || 'ADET'
                    }
                    return next
                }
            }

            next[index] = { ...next[index], [field]: value }
            return next
        })
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!form.customer_id) {
            toast.error('Müşteri (Cari) seçin')
            return
        }

        const validItems = items
            .map((row) => ({
                ...row,
                quantity: Number(row.quantity),
            }))
            .filter((row) => row.product_id || row.product_name)

        if (validItems.length === 0) {
            toast.error('En az bir ürün kalemi girin')
            return
        }

        setSaving(true)
        try {
            const res = await fetchApi<{ success: boolean; waybill: any }>('/api/waybills', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    items: validItems,
                }),
            })

            toast.success('İrsaliye başarıyla oluşturuldu')
            router.push('/waybills')
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Kayıt başarısız')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Breadcrumb items={[
                { label: 'Panel', href: '/dashboard' },
                { label: 'İrsaliyeler', href: '/waybills' },
                { label: 'Yeni İrsaliye' }
            ]} className="mb-4" />

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <Link href="/waybills" className="text-gray-400 hover:text-white mb-2 inline-flex items-center gap-2 transition-colors">
                        ← Geri Dön
                    </Link>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Yeni İrsaliye Oluştur</h1>
                    <p className="text-gray-400 mt-1">Manuel irsaliye kaydı oluşturun veya düzenlenen sevkiyatlardan otomatik oluşturun.</p>
                </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 md:p-8 shadow-xl">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Form Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Müşteri (Cari) *</label>
                            <select
                                value={form.customer_id}
                                onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-xl transition-colors appearance-none"
                                required
                            >
                                <option value="">Cari seçin...</option>
                                {customers.map((a) => (
                                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">İrsaliye Tarihi *</label>
                            <input
                                type="date"
                                value={form.waybill_date}
                                onChange={(e) => setForm((f) => ({ ...f, waybill_date: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-xl transition-colors"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Araç Plakası</label>
                            <input
                                type="text"
                                value={form.vehicle_plate}
                                onChange={(e) => setForm((f) => ({ ...f, vehicle_plate: e.target.value }))}
                                placeholder="Örn: 34 ABC 123"
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-xl transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Sürücü Adı / TCKN</label>
                            <input
                                type="text"
                                value={form.driver_name}
                                onChange={(e) => setForm((f) => ({ ...f, driver_name: e.target.value }))}
                                placeholder="Örn: Ahmet Yılmaz"
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-xl transition-colors"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-gray-300">Teslimat Adresi</label>
                            <input
                                type="text"
                                value={form.delivery_address}
                                onChange={(e) => setForm((f) => ({ ...f, delivery_address: e.target.value }))}
                                placeholder="Sevkiyat adresi"
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-xl transition-colors"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-3 lg:col-span-3">
                            <label className="text-sm font-medium text-gray-300">Genel Notlar</label>
                            <textarea
                                value={form.notes}
                                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                                placeholder="İrsaliye üzerinde görünecek notlar..."
                                rows={2}
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white rounded-xl transition-colors"
                            />
                        </div>
                    </div>

                    <hr className="border-slate-700/50" />

                    {/* Line Items */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-lg font-semibold text-white">İrsaliye Kalemleri</label>
                            <Button type="button" variant="outline" size="sm" onClick={addLine} className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10">
                                <Plus className="h-4 w-4 mr-2" /> Yeni Satır
                            </Button>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-700/50 shadow-inner bg-slate-900/30">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50">
                                        <tr className="text-gray-400 text-left">
                                            <th className="p-4 font-medium min-w-[200px]">Ürün (Mamül) Seçimi</th>
                                            <th className="p-4 font-medium">Manuel Ürün Adı</th>
                                            <th className="p-4 font-medium w-32">Miktar</th>
                                            <th className="p-4 font-medium w-32">Birim</th>
                                            <th className="p-4 font-medium w-48">Not (Opsiyonel)</th>
                                            <th className="p-4 font-medium w-16 text-center">Sil</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/30">
                                        {items.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-800/30 transition-colors group">
                                                <td className="p-3">
                                                    <select
                                                        value={row.product_id}
                                                        onChange={(e) => updateLine(i, 'product_id', e.target.value)}
                                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg appearance-none h-10"
                                                    >
                                                        <option value="">— Sistem dışı manuel ürün</option>
                                                        {products.map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.sku ? `[${p.sku}] ` : ''}{p.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        value={row.product_name}
                                                        onChange={(e) => updateLine(i, 'product_name', e.target.value)}
                                                        placeholder="Örn: Masa Takımı"
                                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg h-10 disabled:opacity-50"
                                                        disabled={!!row.product_id}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="number"
                                                        min={0.01}
                                                        step="any"
                                                        value={row.quantity}
                                                        onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg h-10 text-right"
                                                        required
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <select
                                                        value={row.unit}
                                                        onChange={(e) => updateLine(i, 'unit', e.target.value)}
                                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg appearance-none h-10"
                                                    >
                                                        <option value="ADET">ADET</option>
                                                        <option value="TAKIM">TAKIM</option>
                                                        <option value="KG">KG</option>
                                                        <option value="MT">MT</option>
                                                    </select>
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        value={row.notes}
                                                        onChange={(e) => updateLine(i, 'notes', e.target.value)}
                                                        placeholder="Kalem notu"
                                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-white rounded-lg h-10"
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLine(i)}
                                                        className="p-2 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors opacity-50 group-hover:opacity-100"
                                                        title="Satırı sil"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-700/50">
                        <Button
                            type="button"
                            variant="outline"
                            className="px-6 border-slate-600 text-slate-300 hover:bg-slate-700"
                            onClick={() => router.push('/waybills')}
                        >
                            İptal
                        </Button>
                        <Button
                            type="submit"
                            color="primary"
                            className="px-8 shadow-lg shadow-blue-500/20"
                            disabled={saving}
                        >
                            {saving ? 'Kaydediliyor...' : 'İrsaliyeyi Kaydet'}
                        </Button>
                    </div>

                </form>
            </div>
        </div>
    )
}
