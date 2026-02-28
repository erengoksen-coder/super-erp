'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText, Search, ArrowRight, Trash2, Send, Plus, CheckCircle, TrendingUp, Clock, Package, DollarSign } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { toast } from '@/lib/notify'

type Quotation = {
    id: string; quotation_number: string; customer_name: string | null; customer_code: string | null
    quotation_date: string; valid_until: string | null; status: string; total_amount: number
    item_count: number; converted_order_id: string | null
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    draft: { label: 'Taslak', color: 'bg-yellow-900/30 text-yellow-400 border-yellow-600' },
    sent: { label: 'Gönderildi', color: 'bg-blue-900/30 text-blue-400 border-blue-600' },
    accepted: { label: 'Kabul Edildi', color: 'bg-green-900/30 text-green-400 border-green-600' },
    rejected: { label: 'Reddedildi', color: 'bg-red-900/30 text-red-400 border-red-600' },
    expired: { label: 'Süresi Doldu', color: 'bg-gray-700/30 text-gray-400 border-gray-600' },
    converted: { label: 'Siparişe Dönüştü', color: 'bg-purple-900/30 text-purple-400 border-purple-600' },
}

const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-3 p-4">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4 items-center">
                <div className="h-4 bg-gray-700 rounded w-24" />
                <div className="h-4 bg-gray-700 rounded w-20" />
                <div className="h-4 bg-gray-700 rounded w-32" />
                <div className="h-4 bg-gray-700 rounded w-16 ml-auto" />
            </div>
        ))}
    </div>
)

export default function QuotationsPage() {
    const [quotations, setQuotations] = useState<Quotation[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    useEffect(() => { document.title = 'Teklifler - LIVASOFA ERP' }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search.trim()) params.set('search', search.trim())
            if (statusFilter !== 'all') params.set('status', statusFilter)
            const data = await fetchApi(`/api/quotations?${params}`)
            setQuotations(Array.isArray(data) ? data : (data as any)?.data || [])
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }, [search, statusFilter])

    useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

    const stats = useMemo(() => {
        const all = quotations
        const totalAmount = all.reduce((s, q) => s + (q.total_amount || 0), 0)
        const pending = all.filter(q => q.status === 'draft' || q.status === 'sent')
        const accepted = all.filter(q => q.status === 'accepted')
        const converted = all.filter(q => q.status === 'converted')
        return { totalAmount, pendingCount: pending.length, acceptedCount: accepted.length, convertedCount: converted.length }
    }, [quotations])

    const handleConvert = async (id: string) => {
        if (!confirm('Bu teklifi siparişe dönüştürmek istediğinize emin misiniz?')) return
        try {
            const res = await fetchApi(`/api/quotations/${id}/convert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }) as any
            toast.success(res?.data?.message || res?.message || 'Siparişe dönüştürüldü')
            load()
        } catch (e: any) { toast.error(e.message || 'Hata') }
    }

    const handleStatusChange = async (id: string, status: string) => {
        try {
            await fetchApi(`/api/quotations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
            toast.success('Teklif durumu güncellendi')
            load()
        } catch (e: any) { toast.error(e.message || 'Hata') }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bu teklifi silmek istediğinize emin misiniz?')) return
        try {
            await fetchApi(`/api/quotations/${id}`, { method: 'DELETE' })
            toast.success('Teklif silindi')
            load()
        } catch (e: any) { toast.error(e.message || 'Hata') }
    }

    const fmt = (d: string | null) => { if (!d) return '-'; try { return new Intl.DateTimeFormat('tr-TR').format(new Date(d)) } catch { return d } }
    const fmtCur = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v || 0)

    return (
        <AppDashboardLayout title="Teklifler" subtitle="Teklif oluştur → Onayla → Siparişe dönüştür" icon={FileText}>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-1"><DollarSign className="w-3.5 h-3.5" />Toplam Tutar</div>
                    <div className="text-xl font-bold text-white">{fmtCur(stats.totalAmount)}</div>
                    <div className="text-xs text-gray-500 mt-1">{quotations.length} teklif</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-yellow-400 text-xs font-medium mb-1"><Clock className="w-3.5 h-3.5" />Bekleyen</div>
                    <div className="text-xl font-bold text-white">{stats.pendingCount}</div>
                    <div className="text-xs text-gray-500 mt-1">Taslak + Gönderildi</div>
                </div>
                <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-400 text-xs font-medium mb-1"><CheckCircle className="w-3.5 h-3.5" />Kabul Edilen</div>
                    <div className="text-xl font-bold text-white">{stats.acceptedCount}</div>
                    <div className="text-xs text-gray-500 mt-1">Siparişe hazır</div>
                </div>
                <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-purple-400 text-xs font-medium mb-1"><Package className="w-3.5 h-3.5" />Dönüştürülen</div>
                    <div className="text-xl font-bold text-white">{stats.convertedCount}</div>
                    <div className="text-xs text-gray-500 mt-1">Siparişe dönüşen</div>
                </div>
            </div>

            {/* Actions + Filters */}
            <Card>
                <CardBody className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Input placeholder="Teklif no veya müşteri ara..." leftIcon={<Search className="w-4 h-4" />} value={search} onChange={e => setSearch(e.target.value)} fullWidth />
                        </div>
                        <div className="flex items-center flex-wrap gap-2">
                            {['all', 'draft', 'sent', 'accepted', 'converted'].map(s => (
                                <Button key={s} variant={statusFilter === s ? 'solid' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>
                                    {s === 'all' ? 'Tümü' : STATUS_MAP[s]?.label || s}
                                </Button>
                            ))}
                            <Link href="/quotations/new">
                                <Button variant="solid" color="primary" size="sm"><Plus className="w-4 h-4 mr-1" />Yeni Teklif</Button>
                            </Link>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader title={`Teklif Listesi (${quotations.length})`} />
                <CardBody>
                    {loading ? <LoadingSkeleton /> :
                        quotations.length === 0 ? (
                            <div className="text-center py-16">
                                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-gray-400 mb-1">Henüz teklif yok</h3>
                                <p className="text-sm text-gray-500 mb-4">İlk teklifinizi oluşturmak için butona tıklayın</p>
                                <Link href="/quotations/new">
                                    <Button variant="solid" color="primary" size="sm"><Plus className="w-4 h-4 mr-1" />Yeni Teklif Oluştur</Button>
                                </Link>
                            </div>
                        ) :
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-700 text-left text-gray-400">
                                            <th className="py-3 px-3">Teklif No</th>
                                            <th className="py-3 px-3">Tarih</th>
                                            <th className="py-3 px-3">Geçerlilik</th>
                                            <th className="py-3 px-3">Müşteri</th>
                                            <th className="py-3 px-3 text-center">Kalem</th>
                                            <th className="py-3 px-3 text-right">Toplam</th>
                                            <th className="py-3 px-3">Durum</th>
                                            <th className="py-3 px-3 text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quotations.map(q => {
                                            const st = STATUS_MAP[q.status] || STATUS_MAP.draft
                                            const isExpired = q.valid_until && new Date(q.valid_until) < new Date() && q.status !== 'converted'
                                            return (
                                                <tr key={q.id} className={`border-b border-gray-800 hover:bg-gray-800/40 transition-colors ${isExpired ? 'opacity-60' : ''}`}>
                                                    <td className="py-3 px-3 font-mono font-bold text-white">{q.quotation_number}</td>
                                                    <td className="py-3 px-3 text-gray-300">{fmt(q.quotation_date)}</td>
                                                    <td className="py-3 px-3">
                                                        <span className={isExpired ? 'text-red-400' : 'text-gray-300'}>{fmt(q.valid_until)}</span>
                                                        {isExpired && <span className="ml-1 text-red-400 text-xs">⚠</span>}
                                                    </td>
                                                    <td className="py-3 px-3 text-gray-300">{q.customer_name || '-'}</td>
                                                    <td className="py-3 px-3 text-center"><span className="bg-gray-700/50 px-2 py-0.5 rounded text-gray-300">{q.item_count}</span></td>
                                                    <td className="py-3 px-3 text-right text-white font-bold">{fmtCur(q.total_amount)}</td>
                                                    <td className="py-3 px-3"><span className={`px-2 py-1 rounded text-xs border ${st.color}`}>{st.label}</span></td>
                                                    <td className="py-3 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-1 flex-wrap">
                                                            {q.status === 'draft' && <Button variant="ghost" size="sm" className="text-blue-400 hover:bg-blue-900/30" onClick={() => handleStatusChange(q.id, 'sent')}><Send className="w-3 h-3 mr-1" />Gönder</Button>}
                                                            {(q.status === 'draft' || q.status === 'sent') && <Button variant="ghost" size="sm" className="text-green-400 hover:bg-green-900/30" onClick={() => handleStatusChange(q.id, 'accepted')}><CheckCircle className="w-3 h-3 mr-1" />Onayla</Button>}
                                                            {q.status === 'accepted' && <Button variant="ghost" size="sm" className="text-purple-400 hover:bg-purple-900/30" onClick={() => handleConvert(q.id)}><ArrowRight className="w-3 h-3 mr-1" />Siparişe dönüştür</Button>}
                                                            {q.status !== 'converted' && <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-900/30" onClick={() => handleDelete(q.id)}><Trash2 className="w-3 h-3" /></Button>}
                                                        </div>
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
