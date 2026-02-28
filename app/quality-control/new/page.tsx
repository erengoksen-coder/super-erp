'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, ArrowLeft, Save } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { toast } from '@/lib/notify'

const DEFECT_TYPES = [
    'Boyut Hatası', 'Kumaş Hatası', 'Renk Farkı', 'Dikiş Hatası',
    'Montaj Hatası', 'Yüzey Hatası', 'Malzeme Hatası', 'Diğer'
]

export default function NewQualityControlPage() {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [products, setProducts] = useState<any[]>([])
    const [productionOrders, setProductionOrders] = useState<any[]>([])

    const [form, setForm] = useState({
        product_id: '', product_name: '', production_order_id: '', batch_number: '',
        inspection_date: new Date().toISOString().slice(0, 10),
        quantity_inspected: 0, quantity_passed: 0, quantity_failed: 0,
        defect_type: '', defect_description: '', notes: ''
    })

    useEffect(() => { document.title = 'Yeni Kalite Kontrol - LIVASOFA ERP' }, [])

    const loadMeta = useCallback(async () => {
        try {
            const pr = await fetchApi('/api/products?limit=500')
            setProducts(Array.isArray(pr) ? pr : (pr as any)?.data || [])
            const po = await fetchApi('/api/production-orders?limit=100&status=in_progress')
            setProductionOrders(Array.isArray(po) ? po : (po as any)?.data || [])
        } catch { }
    }, [])

    useEffect(() => { loadMeta() }, [loadMeta])

    const handleProductChange = (productId: string) => {
        const p = products.find((p: any) => p.id === productId)
        setForm(f => ({ ...f, product_id: productId, product_name: p?.name || '' }))
    }

    const handleQuantityChange = (field: string, value: number) => {
        setForm(f => {
            const updated = { ...f, [field]: value }
            if (field === 'quantity_inspected') {
                updated.quantity_passed = Math.max(0, value - updated.quantity_failed)
            } else if (field === 'quantity_failed') {
                updated.quantity_passed = Math.max(0, updated.quantity_inspected - value)
            } else if (field === 'quantity_passed') {
                updated.quantity_failed = Math.max(0, updated.quantity_inspected - value)
            }
            return updated
        })
    }

    const handleSubmit = async () => {
        if (!form.product_name && !form.product_id) { toast.error('Ürün seçin'); return }
        if (form.quantity_inspected <= 0) { toast.error('Kontrol miktarı giriniz'); return }

        setSaving(true)
        try {
            await fetchApi('/api/quality-control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            toast.success('QC kaydı oluşturuldu')
            router.push('/quality-control')
        } catch (e: any) { toast.error(e.message || 'Hata') } finally { setSaving(false) }
    }

    return (
        <AppDashboardLayout title="Yeni Kalite Kontrol" subtitle="Üretim kalite kontrol kaydı oluştur" icon={ClipboardCheck}>
            <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => router.push('/quality-control')}><ArrowLeft className="w-4 h-4 mr-1" />Geri</Button>
            </div>

            <Card>
                <CardHeader title="QC Formu" />
                <CardBody className="p-4 space-y-6">
                    {/* Ürün & Üretim Emri */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Ürün *</label>
                            <select value={form.product_id} onChange={e => handleProductChange(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white">
                                <option value="">Ürün seçin...</option>
                                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Üretim Emri (opsiyonel)</label>
                            <select value={form.production_order_id} onChange={e => setForm(f => ({ ...f, production_order_id: e.target.value }))} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white">
                                <option value="">Seçin...</option>
                                {productionOrders.map((po: any) => <option key={po.id} value={po.id}>{po.order_number} - {po.product_name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Tarih & Parti */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Kontrol Tarihi</label>
                            <Input type="date" value={form.inspection_date} onChange={e => setForm(f => ({ ...f, inspection_date: e.target.value }))} fullWidth />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Parti Numarası</label>
                            <Input value={form.batch_number} onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))} placeholder="LOT-001" fullWidth />
                        </div>
                    </div>

                    {/* Miktarlar */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Kontrol Edilen Miktar *</label>
                            <Input type="number" min={0} value={form.quantity_inspected || ''} onChange={e => handleQuantityChange('quantity_inspected', Number(e.target.value))} fullWidth />
                        </div>
                        <div>
                            <label className="block text-xs text-green-400 mb-1">Geçen Miktar</label>
                            <Input type="number" min={0} value={form.quantity_passed || ''} onChange={e => handleQuantityChange('quantity_passed', Number(e.target.value))} fullWidth />
                        </div>
                        <div>
                            <label className="block text-xs text-red-400 mb-1">Hatalı Miktar</label>
                            <Input type="number" min={0} value={form.quantity_failed || ''} onChange={e => handleQuantityChange('quantity_failed', Number(e.target.value))} fullWidth />
                        </div>
                    </div>

                    {/* Hata oranı gösterge */}
                    {form.quantity_inspected > 0 && (
                        <div className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg">
                            <div className="flex-1 bg-gray-700 rounded-full h-3">
                                <div
                                    className="h-3 rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                                    style={{ width: `${(form.quantity_passed / form.quantity_inspected * 100)}%` }}
                                />
                            </div>
                            <span className="text-sm font-medium text-white">
                                %{(form.quantity_passed / form.quantity_inspected * 100).toFixed(1)} başarı
                            </span>
                        </div>
                    )}

                    {/* Hata detayları */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Hata Tipi</label>
                            <select value={form.defect_type} onChange={e => setForm(f => ({ ...f, defect_type: e.target.value }))} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white">
                                <option value="">Seçin...</option>
                                {DEFECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Hata Açıklaması</label>
                            <Input value={form.defect_description} onChange={e => setForm(f => ({ ...f, defect_description: e.target.value }))} placeholder="Detaylı açıklama..." fullWidth />
                        </div>
                    </div>

                    {/* Notlar */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Notlar</label>
                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white" placeholder="Ek notlar..." />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button variant="solid" color="primary" onClick={handleSubmit} disabled={saving}>
                            <Save className="w-4 h-4 mr-1" />{saving ? 'Kaydediliyor...' : 'QC Kaydı Oluştur'}
                        </Button>
                        <Button variant="outline" onClick={() => router.push('/quality-control')}>İptal</Button>
                    </div>
                </CardBody>
            </Card>
        </AppDashboardLayout>
    )
}
