'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck, Search, Plus, CheckCircle, XCircle, AlertTriangle, Target, BarChart3 } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { toast } from '@/lib/notify'

type QCRecord = {
    id: string; qc_number: string; production_order_id: string | null
    product_name: string | null; batch_number: string | null
    inspection_date: string; quantity_inspected: number; quantity_passed: number
    quantity_failed: number; defect_type: string | null; result: string; status: string; notes: string | null
}

type QCStats = {
    summary: { total: number; passed: number; failed: number; partial: number }
    quantities: { totalInspected: number; totalFailed: number; defectRate: string }
}

const RESULT_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: 'Bekliyor', color: 'bg-gray-700/30 text-gray-400 border-gray-600' },
    passed: { label: 'Geçti', color: 'bg-green-900/30 text-green-400 border-green-600' },
    failed: { label: 'Başarısız', color: 'bg-red-900/30 text-red-400 border-red-600' },
    partial: { label: 'Kısmi', color: 'bg-yellow-900/30 text-yellow-400 border-yellow-600' },
}

const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-3 p-4">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4"><div className="h-4 bg-gray-700 rounded w-24" /><div className="h-4 bg-gray-700 rounded w-32" /><div className="h-4 bg-gray-700 rounded w-20" /><div className="h-4 bg-gray-700 rounded w-16 ml-auto" /></div>
        ))}
    </div>
)

export default function QualityControlPage() {
    const [records, setRecords] = useState<QCRecord[]>([])
    const [stats, setStats] = useState<QCStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [resultFilter, setResultFilter] = useState('all')

    useEffect(() => { document.title = 'Kalite Kontrol - LIVASOFA ERP' }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search.trim()) params.set('search', search.trim())
            if (resultFilter !== 'all') params.set('result', resultFilter)
            const data = await fetchApi(`/api/quality-control?${params}`)
            setRecords(Array.isArray(data) ? data : (data as any)?.data || [])
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }, [search, resultFilter])

    const loadStats = useCallback(async () => {
        try {
            const data = await fetchApi('/api/quality-control/stats')
            setStats((data as any)?.data || data as QCStats)
        } catch { }
    }, [])

    useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])
    useEffect(() => { loadStats() }, [loadStats])

    const fmt = (d: string | null) => { if (!d) return '-'; try { return new Intl.DateTimeFormat('tr-TR').format(new Date(d)) } catch { return d } }

    return (
        <AppDashboardLayout title="Kalite Kontrol" subtitle="Üretim kalite kontrol kayıtları" icon={ClipboardCheck}>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-1"><Target className="w-3.5 h-3.5" />Toplam Kontrol</div>
                    <div className="text-2xl font-bold text-white">{stats?.summary?.total || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-400 text-xs font-medium mb-1"><CheckCircle className="w-3.5 h-3.5" />Geçen</div>
                    <div className="text-2xl font-bold text-white">{stats?.summary?.passed || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-400 text-xs font-medium mb-1"><XCircle className="w-3.5 h-3.5" />Başarısız</div>
                    <div className="text-2xl font-bold text-white">{stats?.summary?.failed || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-yellow-400 text-xs font-medium mb-1"><AlertTriangle className="w-3.5 h-3.5" />Kısmi</div>
                    <div className="text-2xl font-bold text-white">{stats?.summary?.partial || 0}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-purple-400 text-xs font-medium mb-1"><BarChart3 className="w-3.5 h-3.5" />Hata Oranı</div>
                    <div className="text-2xl font-bold text-white">%{stats?.quantities?.defectRate || '0.00'}</div>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardBody className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Input placeholder="QC no, ürün adı, parti no..." leftIcon={<Search className="w-4 h-4" />} value={search} onChange={e => setSearch(e.target.value)} fullWidth />
                        </div>
                        <div className="flex items-center flex-wrap gap-2">
                            {['all', 'passed', 'failed', 'partial'].map(s => (
                                <Button key={s} variant={resultFilter === s ? 'solid' : 'outline'} size="sm" onClick={() => setResultFilter(s)}>
                                    {s === 'all' ? 'Tümü' : RESULT_MAP[s]?.label || s}
                                </Button>
                            ))}
                            <Link href="/quality-control/new">
                                <Button variant="solid" color="primary" size="sm"><Plus className="w-4 h-4 mr-1" />Yeni Kontrol</Button>
                            </Link>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader title={`Kontrol Kayıtları (${records.length})`} />
                <CardBody>
                    {loading ? <LoadingSkeleton /> :
                        records.length === 0 ? (
                            <div className="text-center py-16">
                                <ClipboardCheck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-gray-400 mb-1">Kalite kontrol kaydı yok</h3>
                                <p className="text-sm text-gray-500 mb-4">Üretimde kalite kontrolü başlatmak için kayıt oluşturun</p>
                                <Link href="/quality-control/new">
                                    <Button variant="solid" color="primary" size="sm"><Plus className="w-4 h-4 mr-1" />Yeni Kontrol Oluştur</Button>
                                </Link>
                            </div>
                        ) :
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-700 text-left text-gray-400">
                                            <th className="py-3 px-3">QC No</th>
                                            <th className="py-3 px-3">Tarih</th>
                                            <th className="py-3 px-3">Ürün</th>
                                            <th className="py-3 px-3">Parti No</th>
                                            <th className="py-3 px-3 text-center">Kontrol</th>
                                            <th className="py-3 px-3 text-center">Geçen</th>
                                            <th className="py-3 px-3 text-center">Hatalı</th>
                                            <th className="py-3 px-3">Hata Tipi</th>
                                            <th className="py-3 px-3">Sonuç</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map(r => {
                                            const res = RESULT_MAP[r.result] || RESULT_MAP.pending
                                            const failRate = r.quantity_inspected > 0 ? ((r.quantity_failed / r.quantity_inspected) * 100).toFixed(1) : '0'
                                            return (
                                                <tr key={r.id} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                                                    <td className="py-3 px-3 font-mono font-bold text-white">{r.qc_number}</td>
                                                    <td className="py-3 px-3 text-gray-300">{fmt(r.inspection_date)}</td>
                                                    <td className="py-3 px-3 text-gray-300">{r.product_name || '-'}</td>
                                                    <td className="py-3 px-3 text-gray-400 font-mono text-xs">{r.batch_number || '-'}</td>
                                                    <td className="py-3 px-3 text-center"><span className="bg-gray-700/50 px-2 py-0.5 rounded">{r.quantity_inspected}</span></td>
                                                    <td className="py-3 px-3 text-center text-green-400 font-medium">{r.quantity_passed}</td>
                                                    <td className="py-3 px-3 text-center">
                                                        <span className={`font-medium ${r.quantity_failed > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                                            {r.quantity_failed}{r.quantity_failed > 0 && <span className="text-xs ml-1">(%{failRate})</span>}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-gray-400 text-xs">{r.defect_type || '-'}</td>
                                                    <td className="py-3 px-3">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${res.color}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${r.result === 'passed' ? 'bg-green-400' : r.result === 'failed' ? 'bg-red-400' : r.result === 'partial' ? 'bg-yellow-400' : 'bg-gray-500'}`} />
                                                            {res.label}
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
