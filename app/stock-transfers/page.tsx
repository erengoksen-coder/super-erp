'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Plus, Truck, Warehouse, Package, CheckCircle2 } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { toast } from '@/lib/notify'

type Transfer = {
    id: string; transfer_number: string; from_warehouse_name: string; to_warehouse_name: string
    transfer_date: string; status: string; item_count: number; total_quantity: number; notes: string | null
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    draft: { label: 'Taslak', color: 'bg-yellow-900/30 text-yellow-400 border-yellow-600' },
    in_transit: { label: 'Transfer Ediliyor', color: 'bg-blue-900/30 text-blue-400 border-blue-600' },
    completed: { label: 'Tamamlandı', color: 'bg-green-900/30 text-green-400 border-green-600' },
    cancelled: { label: 'İptal', color: 'bg-red-900/30 text-red-400 border-red-600' },
}

const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-3 p-4">
        {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4"><div className="h-4 bg-gray-700 rounded w-28" /><div className="h-4 bg-gray-700 rounded w-32" /><div className="h-4 bg-gray-700 rounded w-32" /><div className="h-4 bg-gray-700 rounded w-16 ml-auto" /></div>
        ))}
    </div>
)

export default function StockTransfersPage() {
    const [transfers, setTransfers] = useState<Transfer[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [showNewForm, setShowNewForm] = useState(false)
    const [warehouses, setWarehouses] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])

    // Form state
    const [fromWh, setFromWh] = useState('')
    const [toWh, setToWh] = useState('')
    const [items, setItems] = useState<{ product_id: string; product_name: string; quantity: number }[]>([])
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => { document.title = 'Stok Transferleri - LIVASOFA ERP' }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (statusFilter !== 'all') params.set('status', statusFilter)
            const data = await fetchApi(`/api/stock-transfers?${params}`)
            setTransfers(Array.isArray(data) ? data : (data as any)?.data || [])
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }, [statusFilter])

    const loadMeta = useCallback(async () => {
        try {
            const wh = await fetchApi('/api/warehouses')
            setWarehouses(Array.isArray(wh) ? wh : (wh as any)?.data || [])
            const pr = await fetchApi('/api/products?limit=500')
            setProducts(Array.isArray(pr) ? pr : (pr as any)?.data || [])
        } catch { }
    }, [])

    useEffect(() => { load() }, [load])
    useEffect(() => { loadMeta() }, [loadMeta])

    const stats = useMemo(() => {
        const completed = transfers.filter(t => t.status === 'completed').length
        const inTransit = transfers.filter(t => t.status === 'in_transit').length
        const totalQty = transfers.reduce((s, t) => s + (t.total_quantity || 0), 0)
        return { completed, inTransit, totalQty }
    }, [transfers])

    const handleSubmit = async () => {
        if (!fromWh || !toWh) { toast.error('Kaynak ve hedef depo seçin'); return }
        if (fromWh === toWh) { toast.error('Aynı depo seçilemez'); return }
        if (items.length === 0) { toast.error('En az bir ürün ekleyin'); return }

        setSaving(true)
        try {
            await fetchApi('/api/stock-transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from_warehouse_id: fromWh, to_warehouse_id: toWh, items, notes })
            })
            toast.success('Transfer oluşturuldu')
            setShowNewForm(false)
            setItems([])
            setNotes('')
            load()
        } catch (e: any) { toast.error(e.message || 'Hata') } finally { setSaving(false) }
    }

    const addItem = () => { setItems([...items, { product_id: '', product_name: '', quantity: 1 }]) }
    const removeItem = (i: number) => { setItems(items.filter((_, idx) => idx !== i)) }

    const fmt = (d: string | null) => { if (!d) return '-'; try { return new Intl.DateTimeFormat('tr-TR').format(new Date(d)) } catch { return d } }

    return (
        <AppDashboardLayout title="Stok Transferleri" subtitle="Depolar arası stok transferi" icon={ArrowLeftRight}>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-1"><Warehouse className="w-3.5 h-3.5" />Toplam Transfer</div>
                    <div className="text-2xl font-bold text-white">{transfers.length}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border border-orange-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-orange-400 text-xs font-medium mb-1"><Truck className="w-3.5 h-3.5" />Yolda</div>
                    <div className="text-2xl font-bold text-white">{stats.inTransit}</div>
                </div>
                <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-400 text-xs font-medium mb-1"><CheckCircle2 className="w-3.5 h-3.5" />Tamamlanan</div>
                    <div className="text-2xl font-bold text-white">{stats.completed}</div>
                </div>
                <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/20 border border-cyan-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-medium mb-1"><Package className="w-3.5 h-3.5" />Toplam Miktar</div>
                    <div className="text-2xl font-bold text-white">{stats.totalQty.toLocaleString('tr-TR')}</div>
                </div>
            </div>

            {/* Actions + Filters */}
            <Card className="mb-4">
                <CardBody className="p-4">
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                        <div className="flex gap-2">
                            {['all', 'draft', 'in_transit', 'completed'].map(s => (
                                <Button key={s} variant={statusFilter === s ? 'solid' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>
                                    {s === 'all' ? 'Tümü' : STATUS_MAP[s]?.label || s}
                                </Button>
                            ))}
                        </div>
                        <Button variant="solid" color="primary" size="sm" onClick={() => setShowNewForm(!showNewForm)}>
                            <Plus className="w-4 h-4 mr-1" />{showNewForm ? 'İptal' : 'Yeni Transfer'}
                        </Button>
                    </div>
                </CardBody>
            </Card>

            {/* New Transfer Form */}
            {showNewForm && (
                <Card className="mb-4 border-blue-800/50">
                    <CardHeader title="Yeni Transfer Oluştur" />
                    <CardBody className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Kaynak Depo *</label>
                                <select value={fromWh} onChange={e => setFromWh(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white">
                                    <option value="">Seçin...</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Hedef Depo *</label>
                                <select value={toWh} onChange={e => setToWh(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white">
                                    <option value="">Seçin...</option>
                                    {warehouses.filter(w => w.id !== fromWh).map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs text-gray-400">Transfer Kalemleri</label>
                                <Button variant="outline" size="sm" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Ürün Ekle</Button>
                            </div>
                            {items.map((item, i) => (
                                <div key={i} className="flex gap-2 items-center mb-2">
                                    <select value={item.product_id} onChange={e => {
                                        const p = products.find((p: any) => p.id === e.target.value)
                                        const newItems = [...items]
                                        newItems[i] = { ...newItems[i], product_id: e.target.value, product_name: p?.name || '' }
                                        setItems(newItems)
                                    }} className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white">
                                        <option value="">Ürün seçin...</option>
                                        {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                    </select>
                                    <input type="number" min={1} value={item.quantity} onChange={e => {
                                        const newItems = [...items]
                                        newItems[i] = { ...newItems[i], quantity: Number(e.target.value) }
                                        setItems(newItems)
                                    }} className="w-24 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white" placeholder="Miktar" />
                                    <Button variant="ghost" size="sm" className="text-red-400" onClick={() => removeItem(i)}>✕</Button>
                                </div>
                            ))}
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Not</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white" placeholder="Opsiyonel not..." />
                        </div>

                        <Button variant="solid" color="primary" onClick={handleSubmit} disabled={saving}>
                            {saving ? 'Oluşturuluyor...' : 'Transfer Oluştur'}
                        </Button>
                    </CardBody>
                </Card>
            )}

            {/* Table */}
            <Card>
                <CardHeader title={`Transfer Listesi (${transfers.length})`} />
                <CardBody>
                    {loading ? <LoadingSkeleton /> :
                        transfers.length === 0 ? (
                            <div className="text-center py-16">
                                <ArrowLeftRight className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-gray-400 mb-1">Transfer kaydı yok</h3>
                                <p className="text-sm text-gray-500 mb-4">Depolar arası stok transferi oluşturmak için butona tıklayın</p>
                                <Button variant="solid" color="primary" size="sm" onClick={() => setShowNewForm(true)}>
                                    <Plus className="w-4 h-4 mr-1" />Yeni Transfer Oluştur
                                </Button>
                            </div>
                        ) :
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-700 text-left text-gray-400">
                                            <th className="py-3 px-3">Transfer No</th>
                                            <th className="py-3 px-3">Tarih</th>
                                            <th className="py-3 px-3">Kaynak Depo</th>
                                            <th className="py-3 px-3">→</th>
                                            <th className="py-3 px-3">Hedef Depo</th>
                                            <th className="py-3 px-3 text-center">Kalem</th>
                                            <th className="py-3 px-3 text-center">Miktar</th>
                                            <th className="py-3 px-3">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transfers.map(t => {
                                            const st = STATUS_MAP[t.status] || STATUS_MAP.draft
                                            return (
                                                <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                                                    <td className="py-3 px-3 font-mono font-bold text-white">{t.transfer_number}</td>
                                                    <td className="py-3 px-3 text-gray-300">{fmt(t.transfer_date)}</td>
                                                    <td className="py-3 px-3 text-gray-300">{t.from_warehouse_name || '-'}</td>
                                                    <td className="py-3 px-3 text-gray-500">→</td>
                                                    <td className="py-3 px-3 text-gray-300">{t.to_warehouse_name || '-'}</td>
                                                    <td className="py-3 px-3 text-center"><span className="bg-gray-700/50 px-2 py-0.5 rounded">{t.item_count}</span></td>
                                                    <td className="py-3 px-3 text-center text-white font-medium">{t.total_quantity}</td>
                                                    <td className="py-3 px-3">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${st.color}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'completed' ? 'bg-green-400' : t.status === 'in_transit' ? 'bg-blue-400 animate-pulse' : 'bg-yellow-400'}`} />
                                                            {st.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>}
                </CardBody>
            </Card>
        </AppDashboardLayout>
    )
}
