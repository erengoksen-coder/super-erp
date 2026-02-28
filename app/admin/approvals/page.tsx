'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Check, X, Save, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { toast } from '@/lib/notify'

type Approval = {
    id: string; order_id: string; order_number: string; customer_name: string
    product_name: string; order_amount: number; threshold_amount: number
    status: string; requested_by_name: string | null; approved_by_name: string | null
    requested_at: string; approved_at: string | null; notes: string | null
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: 'Onay Bekliyor', color: 'bg-yellow-900/30 text-yellow-400 border-yellow-600' },
    approved: { label: 'Onaylandı', color: 'bg-green-900/30 text-green-400 border-green-600' },
    rejected: { label: 'Reddedildi', color: 'bg-red-900/30 text-red-400 border-red-600' },
}

const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-3 p-4">
        {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 items-center">
                <div className="h-4 bg-gray-700 rounded w-24" />
                <div className="h-4 bg-gray-700 rounded w-32" />
                <div className="h-4 bg-gray-700 rounded w-20" />
                <div className="h-4 bg-gray-700 rounded w-24 ml-auto" />
            </div>
        ))}
    </div>
)

export default function ApprovalsPage() {
    const [approvals, setApprovals] = useState<Approval[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'pending' | 'all'>('pending')
    const [threshold, setThreshold] = useState<number>(50000)
    const [thresholdInput, setThresholdInput] = useState('50000')
    const [savingThreshold, setSavingThreshold] = useState(false)

    useEffect(() => { document.title = 'Sipariş Onayları - LIVASOFA ERP' }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await fetchApi('/api/orders/approve')
            const list = Array.isArray(data) ? data : (data as any)?.data || []
            setApprovals(list)
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }, [])

    const loadThreshold = useCallback(async () => {
        try {
            const res = await fetchApi<{ threshold: number }>('/api/settings/order-approval-threshold')
            const t = (res as any)?.threshold ?? 50000
            setThreshold(t)
            setThresholdInput(String(t))
        } catch { setThreshold(50000); setThresholdInput('50000') }
    }, [])

    useEffect(() => { load() }, [load])
    useEffect(() => { loadThreshold() }, [loadThreshold])

    const stats = useMemo(() => {
        const pending = approvals.filter(a => a.status === 'pending')
        const approved = approvals.filter(a => a.status === 'approved')
        const rejected = approvals.filter(a => a.status === 'rejected')
        const totalPendingAmount = pending.reduce((s, a) => s + (a.order_amount || 0), 0)
        return { pendingCount: pending.length, approvedCount: approved.length, rejectedCount: rejected.length, totalPendingAmount }
    }, [approvals])

    const saveThreshold = async () => {
        const val = Number(thresholdInput)
        if (isNaN(val) || val < 0) { toast.error('Geçerli bir tutar girin'); return }
        setSavingThreshold(true)
        try {
            await fetchApi('/api/settings/order-approval-threshold', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ threshold: val }) })
            setThreshold(val)
            toast.success('Onay eşiği güncellendi')
        } catch (e: any) { toast.error(e?.message || 'Kaydedilemedi') } finally { setSavingThreshold(false) }
    }

    const handleAction = async (orderId: string, action: 'approve' | 'reject') => {
        const msg = action === 'approve' ? 'onaylamak' : 'reddetmek'
        if (!confirm(`Bu siparişi ${msg} istediğinize emin misiniz?`)) return
        try {
            const res = await fetchApi(`/api/orders/${orderId}/approve`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
            }) as any
            toast.success(res?.data?.message || res?.message || `Sipariş ${action === 'approve' ? 'onaylandı' : 'reddedildi'}`)
            load()
        } catch (e: any) { toast.error(e.message || 'Hata') }
    }

    const filtered = tab === 'pending' ? approvals.filter(a => a.status === 'pending') : approvals
    const fmt = (d: string | null) => { if (!d) return '-'; try { return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d)) } catch { return d } }
    const fmtCur = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v || 0)

    return (
        <AppDashboardLayout title="Sipariş Onayları" subtitle="Tutar bazlı yönetici onayı" icon={ShieldCheck}>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-yellow-400 text-xs font-medium mb-1"><Clock className="w-3.5 h-3.5" />Bekleyen</div>
                    <div className="text-2xl font-bold text-white">{stats.pendingCount}</div>
                    <div className="text-xs text-gray-500 mt-1">onay bekliyor</div>
                </div>
                <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-400 text-xs font-medium mb-1"><CheckCircle className="w-3.5 h-3.5" />Onaylanan</div>
                    <div className="text-2xl font-bold text-white">{stats.approvedCount}</div>
                    <div className="text-xs text-gray-500 mt-1">sipariş onaylandı</div>
                </div>
                <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-400 text-xs font-medium mb-1"><XCircle className="w-3.5 h-3.5" />Reddedilen</div>
                    <div className="text-2xl font-bold text-white">{stats.rejectedCount}</div>
                    <div className="text-xs text-gray-500 mt-1">sipariş reddedildi</div>
                </div>
                <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border border-orange-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-orange-400 text-xs font-medium mb-1"><DollarSign className="w-3.5 h-3.5" />Bekleyen Tutar</div>
                    <div className="text-lg font-bold text-white">{fmtCur(stats.totalPendingAmount)}</div>
                    <div className="text-xs text-gray-500 mt-1">onay bekliyor</div>
                </div>
            </div>

            {/* Threshold Config */}
            <Card className="mb-4">
                <CardBody className="p-4">
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-white">Onay eşiği</div>
                                <div className="text-xs text-gray-500">Bu tutar ve üzeri siparişler yönetici onayına düşer</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input type="number" min={0} step={1000} value={thresholdInput} onChange={e => setThresholdInput(e.target.value)} className="w-32" />
                            <span className="text-gray-500 text-sm">TL</span>
                            <Button size="sm" variant="solid" color="primary" onClick={saveThreshold} disabled={savingThreshold}>
                                <Save className="w-3 h-3 mr-1" />{savingThreshold ? '...' : 'Kaydet'}
                            </Button>
                        </div>
                        <div className="text-sm text-gray-400">
                            Aktif eşik: <span className="text-white font-semibold">{fmtCur(threshold)}</span>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <Button variant={tab === 'pending' ? 'solid' : 'outline'} color="warning" size="sm" onClick={() => setTab('pending')}>
                    <Clock className="w-3.5 h-3.5 mr-1" />Onay Bekleyenler ({stats.pendingCount})
                </Button>
                <Button variant={tab === 'all' ? 'solid' : 'outline'} size="sm" onClick={() => setTab('all')}>
                    Tümü ({approvals.length})
                </Button>
            </div>

            <Card>
                <CardHeader title={`Onay Listesi (${filtered.length})`} />
                <CardBody>
                    {loading ? <LoadingSkeleton /> :
                        filtered.length === 0 ? (
                            <div className="text-center py-16">
                                <ShieldCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-gray-400 mb-1">{tab === 'pending' ? 'Onay bekleyen sipariş yok' : 'Henüz onay kaydı yok'}</h3>
                                <p className="text-sm text-gray-500">{tab === 'pending' ? 'Eşik değeri aşan siparişler burada görünecek' : 'Onay gereken siparişler oluşturulduğunda burada listelenecek'}</p>
                            </div>
                        ) :
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-700 text-left text-gray-400">
                                            <th className="py-3 px-3">Sipariş No</th>
                                            <th className="py-3 px-3">Müşteri</th>
                                            <th className="py-3 px-3">Ürün</th>
                                            <th className="py-3 px-3 text-right">Tutar</th>
                                            <th className="py-3 px-3 text-right">Eşik</th>
                                            <th className="py-3 px-3">Talep Eden</th>
                                            <th className="py-3 px-3">Tarih</th>
                                            <th className="py-3 px-3">Durum</th>
                                            <th className="py-3 px-3 text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(a => {
                                            const st = STATUS_MAP[a.status] || STATUS_MAP.pending
                                            const overThreshold = a.order_amount > a.threshold_amount
                                            return (
                                                <tr key={a.id} className={`border-b border-gray-800 hover:bg-gray-800/40 transition-colors ${a.status === 'pending' ? 'bg-yellow-900/5' : ''}`}>
                                                    <td className="py-3 px-3 font-mono font-bold text-white">{a.order_number}</td>
                                                    <td className="py-3 px-3 text-gray-300">{a.customer_name || '-'}</td>
                                                    <td className="py-3 px-3 text-gray-300 text-xs max-w-[150px] truncate">{a.product_name || '-'}</td>
                                                    <td className="py-3 px-3 text-right">
                                                        <span className={`font-bold ${overThreshold ? 'text-red-400' : 'text-white'}`}>{fmtCur(a.order_amount)}</span>
                                                    </td>
                                                    <td className="py-3 px-3 text-right text-gray-500 text-xs">{fmtCur(a.threshold_amount)}</td>
                                                    <td className="py-3 px-3 text-gray-300">{a.requested_by_name || '-'}</td>
                                                    <td className="py-3 px-3 text-gray-400 text-xs">{fmt(a.requested_at)}</td>
                                                    <td className="py-3 px-3">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${st.color}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'pending' ? 'bg-yellow-400 animate-pulse' : a.status === 'approved' ? 'bg-green-400' : 'bg-red-400'}`} />
                                                            {st.label}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-right">
                                                        {a.status === 'pending' && (
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button variant="ghost" size="sm" className="text-green-400 hover:bg-green-900/20" onClick={() => handleAction(a.order_id, 'approve')}>
                                                                    <Check className="w-4 h-4 mr-1" />Onayla
                                                                </Button>
                                                                <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-900/20" onClick={() => handleAction(a.order_id, 'reject')}>
                                                                    <X className="w-4 h-4 mr-1" />Reddet
                                                                </Button>
                                                            </div>
                                                        )}
                                                        {a.status === 'approved' && <span className="text-green-400 text-xs flex items-center justify-end gap-1"><CheckCircle className="w-3 h-3" />{a.approved_by_name || 'Onaylı'}</span>}
                                                        {a.status === 'rejected' && <span className="text-red-400 text-xs flex items-center justify-end gap-1"><XCircle className="w-3 h-3" />{a.approved_by_name || 'Reddedildi'}</span>}
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
