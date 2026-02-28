'use client'

import { useState, useEffect } from 'react'
import { Warehouse, Plus, ArrowRightLeft, Package, Trash2, X } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { fetchApi } from '@/lib/api/client'

interface WarehouseItem {
    id: string
    code: string
    name: string
    stock_count: number
    stock_value: number
    created_at: string
}

interface Material {
    id: string
    name: string
    stock_amount: number
    unit: string
}

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
    const [materials, setMaterials] = useState<Material[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [showTransfer, setShowTransfer] = useState(false)
    const [createForm, setCreateForm] = useState({ code: '', name: '' })
    const [transferForm, setTransferForm] = useState({
        from_warehouse_id: '', to_warehouse_id: '', material_id: '', quantity: '', notes: ''
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        try {
            const [wData, mData] = await Promise.all([
                fetch('/api/warehouses', { credentials: 'include' }).then(r => r.json()),
                fetchApi<Material[]>('/api/inventory/materials')
            ])
            setWarehouses(Array.isArray(wData) ? wData : [])
            setMaterials(Array.isArray(mData) ? mData : [])
        } catch { }
        setLoading(false)
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault()
        if (!createForm.code || !createForm.name) return
        setSaving(true)
        try {
            await fetch('/api/warehouses', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm)
            })
            setCreateForm({ code: '', name: '' })
            setShowCreate(false)
            loadData()
        } catch { }
        setSaving(false)
    }

    async function handleTransfer(e: React.FormEvent) {
        e.preventDefault()
        if (!transferForm.from_warehouse_id || !transferForm.to_warehouse_id || !transferForm.material_id || !transferForm.quantity) return
        setSaving(true)
        try {
            await fetch('/api/warehouses/transfer', {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...transferForm, quantity: Number(transferForm.quantity) })
            })
            setShowTransfer(false)
            setTransferForm({ from_warehouse_id: '', to_warehouse_id: '', material_id: '', quantity: '', notes: '' })
            loadData()
        } catch { }
        setSaving(false)
    }

    async function handleDelete(id: string) {
        if (!confirm('Bu depoyu silmek istediğinize emin misiniz?')) return
        try {
            await fetch(`/api/warehouses?id=${id}`, { method: 'DELETE', credentials: 'include' })
            loadData()
        } catch { }
    }

    return (
        <AppDashboardLayout title="Depo Yönetimi" subtitle="Tüm depoları görüntüleyin ve yönetin" icon={Warehouse}>
            {/* Üst Bar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <Badge variant="info" size="lg">Toplam: {warehouses.length} depo</Badge>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => setShowTransfer(true)}>
                    <ArrowRightLeft className="w-4 h-4 mr-1.5" />
                    Transfer
                </Button>
                <Button variant="solid" color="primary" size="sm" onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Yeni Depo
                </Button>
            </div>

            {/* Depo Kartları */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i}><CardBody className="p-6"><div className="h-24 animate-pulse bg-gray-200 dark:bg-slate-700 rounded" /></CardBody></Card>
                    ))}
                </div>
            ) : warehouses.length === 0 ? (
                <Card><CardBody className="p-12 text-center">
                    <Warehouse className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-500 dark:text-slate-400">Henüz depo bulunmuyor.</p>
                </CardBody></Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {warehouses.map(w => (
                        <Card key={w.id} hover className="group">
                            <CardBody className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                                            <Warehouse className="w-5 h-5 text-indigo-500" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white">{w.name}</h3>
                                            <p className="text-xs text-gray-500 dark:text-slate-400">{w.code}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(w.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                                    <div className="flex items-center gap-1.5">
                                        <Package className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-600 dark:text-slate-300">
                                            {w.stock_count} kalem
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-slate-300">
                                        {w.stock_value > 0 ? `${Math.round(w.stock_value)} adet hareket` : 'Boş'}
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            {/* Yeni Depo Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
                    <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <CardBody className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Yeni Depo</h3>
                                <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Depo Kodu</label>
                                    <input
                                        type="text" required placeholder="DEP-002"
                                        value={createForm.code} onChange={e => setCreateForm(p => ({ ...p, code: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Depo Adı</label>
                                    <input
                                        type="text" required placeholder="Yedek Parça Deposu"
                                        value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" size="sm" type="button" onClick={() => setShowCreate(false)}>İptal</Button>
                                    <Button variant="solid" color="primary" size="sm" type="submit" disabled={saving}>
                                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </Button>
                                </div>
                            </form>
                        </CardBody>
                    </Card>
                </div>
            )}

            {/* Transfer Modal */}
            {showTransfer && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTransfer(false)}>
                    <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <CardBody className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    <ArrowRightLeft className="w-5 h-5 inline mr-2" />
                                    Depolar Arası Transfer
                                </h3>
                                <button onClick={() => setShowTransfer(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleTransfer} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Kaynak Depo</label>
                                    <select required value={transferForm.from_warehouse_id} onChange={e => setTransferForm(p => ({ ...p, from_warehouse_id: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                                        <option value="">Seçin</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Hedef Depo</label>
                                    <select required value={transferForm.to_warehouse_id} onChange={e => setTransferForm(p => ({ ...p, to_warehouse_id: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                                        <option value="">Seçin</option>
                                        {warehouses.filter(w => w.id !== transferForm.from_warehouse_id).map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Malzeme</label>
                                    <select required value={transferForm.material_id} onChange={e => setTransferForm(p => ({ ...p, material_id: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                                        <option value="">Seçin</option>
                                        {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.stock_amount} {m.unit})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Miktar</label>
                                    <input type="number" required min="0.01" step="0.01" placeholder="10"
                                        value={transferForm.quantity} onChange={e => setTransferForm(p => ({ ...p, quantity: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Not (opsiyonel)</label>
                                    <input type="text" placeholder="Transfer açıklaması"
                                        value={transferForm.notes} onChange={e => setTransferForm(p => ({ ...p, notes: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" size="sm" type="button" onClick={() => setShowTransfer(false)}>İptal</Button>
                                    <Button variant="solid" color="primary" size="sm" type="submit" disabled={saving}>
                                        {saving ? 'Transfer ediliyor...' : 'Transferi Başlat'}
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
