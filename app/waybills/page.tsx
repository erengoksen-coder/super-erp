'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileText, Search, Download, Truck, ClipboardList, CheckCircle2, AlertCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { toast } from '@/lib/notify'

type Waybill = {
    id: string; waybill_number: string; shipment_id: string | null; customer_id: string
    customer_name: string | null; customer_code: string | null; shipment_number: string | null
    waybill_date: string; driver_name: string | null; vehicle_plate: string | null
    delivery_address: string | null; status: string; total_quantity: number; item_count: number; notes: string | null
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    draft: { label: 'Taslak', color: 'bg-yellow-900/30 text-yellow-400 border-yellow-600' },
    issued: { label: 'Düzenlendi', color: 'bg-blue-900/30 text-blue-400 border-blue-600' },
    delivered: { label: 'Teslim Edildi', color: 'bg-green-900/30 text-green-400 border-green-600' },
    cancelled: { label: 'İptal', color: 'bg-red-900/30 text-red-400 border-red-600' },
}

const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-3 p-4">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4 items-center">
                <div className="h-4 bg-gray-700 rounded w-28" />
                <div className="h-4 bg-gray-700 rounded w-20" />
                <div className="h-4 bg-gray-700 rounded w-32" />
                <div className="h-4 bg-gray-700 rounded w-20" />
                <div className="h-4 bg-gray-700 rounded w-16 ml-auto" />
            </div>
        ))}
    </div>
)

export default function WaybillsPage() {
    const [waybills, setWaybills] = useState<Waybill[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [total, setTotal] = useState(0)

    useEffect(() => { document.title = 'İrsaliyeler - LIVASOFA ERP' }, [])

    const loadWaybills = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (search.trim()) params.set('search', search.trim())
            if (statusFilter !== 'all') params.set('status', statusFilter)
            params.set('limit', '100')
            const data = await fetchApi(`/api/waybills?${params}`)
            const list = Array.isArray(data) ? data : (data as any)?.data || []
            setWaybills(list)
            setTotal((data as any)?.meta?.total ?? list.length)
        } catch (e) {
            console.error('İrsaliyeler yüklenemedi:', e)
        } finally {
            setLoading(false)
        }
    }, [search, statusFilter])

    useEffect(() => { const t = setTimeout(() => loadWaybills(), 300); return () => clearTimeout(t) }, [loadWaybills])

    const stats = useMemo(() => {
        const drafts = waybills.filter(w => w.status === 'draft').length
        const issued = waybills.filter(w => w.status === 'issued').length
        const delivered = waybills.filter(w => w.status === 'delivered').length
        const totalQty = waybills.reduce((s, w) => s + (w.total_quantity || 0), 0)
        return { drafts, issued, delivered, totalQty }
    }, [waybills])

    const handleDownloadPDF = (id: string) => { window.open(`/api/waybills/${id}/pdf`, '_blank') }

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await fetchApi(`/api/waybills/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
            toast.success('İrsaliye durumu güncellendi')
            loadWaybills()
        } catch (e: any) { toast.error('Hata: ' + (e.message || 'Güncelleme başarısız')) }
    }

    const formatDate = (d: string | null) => { if (!d) return '-'; try { return new Intl.DateTimeFormat('tr-TR').format(new Date(d)) } catch { return d } }

    return (
        <AppDashboardLayout title="İrsaliyeler" subtitle="Sevk irsaliyesi yönetimi" icon={FileText}>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-1"><ClipboardList className="w-3.5 h-3.5" />Toplam</div>
                    <div className="text-xl font-bold text-white">{total}</div>
                    <div className="text-xs text-gray-500 mt-1">irsaliye</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-yellow-400 text-xs font-medium mb-1"><AlertCircle className="w-3.5 h-3.5" />Taslak</div>
                    <div className="text-xl font-bold text-white">{stats.drafts}</div>
                    <div className="text-xs text-gray-500 mt-1">düzenlenmemiş</div>
                </div>
                <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-400 text-xs font-medium mb-1"><CheckCircle2 className="w-3.5 h-3.5" />Teslim Edilen</div>
                    <div className="text-xl font-bold text-white">{stats.delivered}</div>
                    <div className="text-xs text-gray-500 mt-1">tamamlanan</div>
                </div>
                <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/20 border border-cyan-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-medium mb-1"><Truck className="w-3.5 h-3.5" />Toplam Miktar</div>
                    <div className="text-xl font-bold text-white">{stats.totalQty.toLocaleString('tr-TR')}</div>
                    <div className="text-xs text-gray-500 mt-1">adet sevk</div>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardBody className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Input placeholder="İrsaliye no, müşteri, şoför, plaka ara..." leftIcon={<Search className="w-4 h-4" />} value={search} onChange={(e) => setSearch(e.target.value)} fullWidth />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {['all', 'draft', 'issued', 'delivered'].map((s) => (
                                <Button key={s} variant={statusFilter === s ? 'solid' : 'outline'} color={s === 'all' ? 'primary' : s === 'draft' ? 'warning' : s === 'issued' ? 'primary' : 'success'} size="sm" onClick={() => setStatusFilter(s)}>
                                    {s === 'all' ? `Tümü (${total})` : STATUS_MAP[s]?.label || s}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader title={`İrsaliye Listesi (${waybills.length})`} />
                <CardBody>
                    {loading ? <LoadingSkeleton /> :
                        waybills.length === 0 ? (
                            <div className="text-center py-16">
                                <Truck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-gray-400 mb-1">İrsaliye bulunamadı</h3>
                                <p className="text-sm text-gray-500">Arama kriterlerinize uygun irsaliye yok</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-700 text-left text-gray-400">
                                            <th className="py-3 px-3">İrsaliye No</th>
                                            <th className="py-3 px-3">Tarih</th>
                                            <th className="py-3 px-3">Müşteri</th>
                                            <th className="py-3 px-3">Şoför</th>
                                            <th className="py-3 px-3">Plaka</th>
                                            <th className="py-3 px-3 text-center">Kalem</th>
                                            <th className="py-3 px-3 text-center">Miktar</th>
                                            <th className="py-3 px-3">Durum</th>
                                            <th className="py-3 px-3">Sevkiyat</th>
                                            <th className="py-3 px-3 text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {waybills.map((w) => {
                                            const st = STATUS_MAP[w.status] || STATUS_MAP.draft
                                            return (
                                                <tr key={w.id} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                                                    <td className="py-3 px-3 font-mono font-bold text-white">{w.waybill_number}</td>
                                                    <td className="py-3 px-3 text-gray-300">{formatDate(w.waybill_date)}</td>
                                                    <td className="py-3 px-3 text-gray-300">{w.customer_name || '-'}</td>
                                                    <td className="py-3 px-3 text-gray-300">{w.driver_name || '-'}</td>
                                                    <td className="py-3 px-3 text-gray-300 font-mono">{w.vehicle_plate || '-'}</td>
                                                    <td className="py-3 px-3 text-center"><span className="bg-gray-700/50 px-2 py-0.5 rounded text-gray-300">{w.item_count}</span></td>
                                                    <td className="py-3 px-3 text-center text-gray-300">{w.total_quantity}</td>
                                                    <td className="py-3 px-3"><span className={`px-2 py-1 rounded text-xs border ${st.color}`}>{st.label}</span></td>
                                                    <td className="py-3 px-3 text-gray-400 font-mono text-xs">{w.shipment_number || '-'}</td>
                                                    <td className="py-3 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button variant="ghost" size="sm" className="hover:bg-gray-700/50" onClick={() => handleDownloadPDF(w.id)} title="PDF İndir">
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                            {w.status === 'draft' && (
                                                                <Button variant="ghost" size="sm" className="text-blue-400 hover:bg-blue-900/30" onClick={() => handleStatusChange(w.id, 'issued')} title="Düzenle">
                                                                    Düzenle
                                                                </Button>
                                                            )}
                                                            {w.status === 'issued' && (
                                                                <Button variant="ghost" size="sm" className="text-green-400 hover:bg-green-900/30" onClick={() => handleStatusChange(w.id, 'delivered')} title="Teslim Edildi">
                                                                    Teslim
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                </CardBody>
            </Card>
        </AppDashboardLayout>
    )
}
