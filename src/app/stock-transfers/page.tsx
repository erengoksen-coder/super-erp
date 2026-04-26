'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Plus, Truck, Warehouse, Package, CheckCircle2, History, AlertCircle, ShoppingCart, Search, Filter, X } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/utils/dateFormat'

type Transfer = {
    id: string; 
    transfer_number: string; 
    from_warehouse_name: string; 
    to_warehouse_name: string;
    transfer_date: string; 
    status: 'draft' | 'in_transit' | 'completed' | 'cancelled'; 
    item_count: number; 
    total_quantity: number; 
    notes: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    draft: { label: 'Taslak', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    in_transit: { label: 'Yolda', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    completed: { label: 'Tamamlandı', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    cancelled: { label: 'İptal', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
}

export default function StockTransfersPage() {
    const [transfers, setTransfers] = useState<Transfer[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')
    const [showNewForm, setShowNewForm] = useState(false)
    const [warehouses, setWarehouses] = useState<any[]>([])
    const [products, setProducts] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    // Form state
    const [fromWh, setFromWh] = useState('')
    const [toWh, setToWh] = useState('')
    const [selectedItems, setSelectedItems] = useState<{ product_id: string; product_name: string; quantity: number }[]>([])
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
        } catch (e) { 
            console.error(e)
            toast.error('Veriler yüklenirken hata oluştu')
        } finally { 
            setLoading(false) 
        }
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

    const displayedTransfers = useMemo(() => {
        return transfers.filter(t => 
            t.transfer_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.from_warehouse_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.to_warehouse_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [transfers, searchTerm])

    const handleSubmit = async () => {
        if (!fromWh || !toWh) { toast.error('Kaynak ve hedef depo seçin'); return }
        if (fromWh === toWh) { toast.error('Aynı depo seçilemez'); return }
        if (selectedItems.length === 0) { toast.error('En az bir ürün ekleyin'); return }

        setSaving(true)
        try {
            const response = await fetchApi('/api/stock-transfers', {
                method: 'POST',
                body: JSON.stringify({
                    from_warehouse_id: fromWh,
                    to_warehouse_id: toWh,
                    items: selectedItems,
                    notes
                })
            })
            
            toast.success('Transfer başarıyla oluşturuldu')
            setShowNewForm(false)
            setFromWh('')
            setToWh('')
            setSelectedItems([])
            setNotes('')
            load()
        } catch (error) {
            toast.error('Transfer kaydedilemedi')
        } finally {
            setSaving(false)
        }
    }

    const addItem = (productId: string) => {
        const product = products.find(p => p.id === productId)
        if (!product) return
        
        if (selectedItems.find(i => i.product_id === productId)) {
            toast.error('Bu ürün zaten listede')
            return
        }

        setSelectedItems([...selectedItems, { 
            product_id: product.id, 
            product_name: product.name, 
            quantity: 1 
        }])
    }

    const removeItem = (index: number) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== index))
    }

    const updateQty = (index: number, qty: number) => {
        const next = [...selectedItems]
        next[index].quantity = Math.max(1, qty)
        setSelectedItems(next)
    }

    return (
        <AppDashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter uppercase flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shadow-glow-sm">
                                <ArrowLeftRight className="w-8 h-8" />
                            </div>
                            Stok Transferleri
                        </h1>
                        <p className="text-foreground/40 font-bold text-sm ml-14 -mt-1 tracking-widest uppercase">
                            Depolar arası mal sevkiyatı ve takibi
                        </p>
                    </div>
                    <Button 
                        size="lg" 
                        variant="primary" 
                        onClick={() => setShowNewForm(true)} 
                        className="h-14 px-8 rounded-2xl font-black tracking-widest shadow-glow hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        YENİ TRANSFER
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card variant="glass">
                        <CardBody className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Teslim Edilen</p>
                                <p className="text-3xl font-black">{stats.completed}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                        </CardBody>
                    </Card>
                    <Card variant="glass">
                        <CardBody className="p-6 flex items-center justify-between font-bold text-blue-400">
                            <div>
                                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Transfer Halinde</p>
                                <p className="text-3xl font-black">{stats.inTransit}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-blue-500/10">
                                <Truck className="w-6 h-6" />
                            </div>
                        </CardBody>
                    </Card>
                    <Card variant="glass">
                        <CardBody className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Toplam Miktar</p>
                                <p className="text-3xl font-black">{stats.totalQty}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                                <Package className="w-6 h-6" />
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Filters & Table */}
                <Card variant="glass" className="overflow-hidden border-white/5">
                    <CardHeader className="p-4 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                            {(['all', 'in_transit', 'completed', 'cancelled'] as const).map(f => (
                                <button 
                                    key={f} 
                                    onClick={() => setStatusFilter(f)} 
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all", 
                                        statusFilter === f ? "bg-primary text-white shadow-glow-sm" : "text-foreground/40 hover:text-foreground/60"
                                    )}
                                >
                                    {f === 'all' ? 'HEPSİ' : f === 'in_transit' ? 'YOLDA' : f === 'completed' ? 'TAMAMLANDI' : 'İPTAL'}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full md:w-64 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-primary transition-colors" />
                            <Input variant="filled" placeholder="Transfer no veya depo ara..." className="pl-9 h-9 text-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </CardHeader>
                    <CardBody className="p-0">
                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/5 text-[9px] font-black text-foreground/40 uppercase tracking-widest">
                                        <th className="p-4 text-left">Transfer No</th>
                                        <th className="p-4 text-left">Kaynak Depo</th>
                                        <th className="p-4 text-left">Hedef Depo</th>
                                        <th className="p-4 text-left">Tarih</th>
                                        <th className="p-4 text-left">Miktar</th>
                                        <th className="p-4 text-left">Durum</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr><td colSpan={6} className="py-20 text-center opacity-40 font-black tracking-widest text-xs uppercase">Yükleniyor...</td></tr>
                                    ) : displayedTransfers.length === 0 ? (
                                        <tr><td colSpan={6} className="py-20 text-center opacity-20 font-black tracking-widest text-xs uppercase">Kayıt Bulunamadı</td></tr>
                                    ) : (
                                        displayedTransfers.map(t => (
                                            <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="p-4">
                                                    <span className="font-mono text-xs font-black text-primary group-hover:underline cursor-pointer">{t.transfer_number}</span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Warehouse className="w-3.5 h-3.5 text-foreground/30" />
                                                        <span className="text-xs font-bold uppercase">{t.from_warehouse_name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Truck className="w-3.5 h-3.5 text-foreground/30" />
                                                        <span className="text-xs font-bold uppercase">{t.to_warehouse_name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-xs font-bold opacity-60">
                                                    {formatDate(t.transfer_date)}
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-xs font-black px-2 py-0.5 bg-white/5 rounded border border-white/5">{t.total_quantity} Adet</span>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="soft" className={cn("text-[9px] font-black px-3", STATUS_MAP[t.status]?.color)}>
                                                        {STATUS_MAP[t.status]?.label.toUpperCase()}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardBody>
                </Card>

                {/* New Transfer Modal */}
                {showNewForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in transition-all">
                        <Card variant="glass" className="w-full max-w-2xl border-white/10 shadow-2xl overflow-hidden scale-in animate-in">
                            <CardHeader className="p-6 border-b border-white/5 flex items-center justify-between bg-primary/5">
                                <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <ArrowLeftRight className="w-5 h-5 text-primary" />
                                    YENİ STOK TRANSFERİ OLUŞTUR
                                </h2>
                                <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)} className="rounded-full w-10 h-10 p-0">
                                    <X className="w-5 h-5" />
                                </Button>
                            </CardHeader>
                            <CardBody className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest ml-1">Kaynak Depo</label>
                                        <select 
                                            value={fromWh} 
                                            onChange={e => setFromWh(e.target.value)}
                                            className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                                        >
                                            <option value="">Depo Seçin</option>
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest ml-1">Hedef Depo</label>
                                        <select 
                                            value={toWh} 
                                            onChange={e => setToWh(e.target.value)}
                                            className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                                        >
                                            <option value="">Hedef Seçin</option>
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5" />
                                        Transfer Edilecek Ürünler
                                    </label>
                                    <div className="flex gap-2">
                                        <select 
                                            className="flex-1 h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all cursor-pointer"
                                            onChange={(e) => { if(e.target.value) addItem(e.target.value); e.target.value = ''; }}
                                        >
                                            <option value="">Ürün Arama ve Ekleme...</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku || '-'})</option>)}
                                        </select>
                                    </div>

                                    <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-white/5 text-[8px] font-black text-foreground/30 uppercase tracking-widest">
                                                    <th className="p-3 text-left">Ürün</th>
                                                    <th className="p-3 text-center w-24">Miktar</th>
                                                    <th className="p-3 text-right w-16">#</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {selectedItems.length === 0 ? (
                                                    <tr><td colSpan={3} className="p-10 text-center text-xs italic opacity-30">Henüz ürün eklenmedi</td></tr>
                                                ) : (
                                                    selectedItems.map((item, i) => (
                                                        <tr key={item.product_id} className="text-xs">
                                                            <td className="p-3 font-bold uppercase">{item.product_name}</td>
                                                            <td className="p-3">
                                                                <Input 
                                                                    type="number" 
                                                                    value={item.quantity} 
                                                                    onChange={e => updateQty(i, parseInt(e.target.value))}
                                                                    className="h-8 text-center font-black"
                                                                />
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-error hover:bg-error/10 p-1 h-7 w-7">
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-foreground/40 uppercase tracking-widest ml-1">Notlar</label>
                                    <textarea 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-bold focus:outline-none focus:border-primary/50 transition-all min-h-[100px]" 
                                        placeholder="Transfer ile ilgili ek bilgiler..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <Button variant="ghost" onClick={() => setShowNewForm(false)} className="font-bold tracking-widest uppercase">İPTAL</Button>
                                    <Button 
                                        variant="primary" 
                                        size="lg" 
                                        onClick={handleSubmit} 
                                        disabled={saving}
                                        className="px-10 font-black tracking-widest uppercase shadow-glow hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {saving ? 'KAYDEDİLİYOR...' : 'TRANSFERİ BAŞLAT'}
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                )}
            </div>
        </AppDashboardLayout>
    )
}