'use client'

import { useState, useEffect } from 'react'
import { Shield, Search, Download, ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { fetchApi } from '@/lib/api/client'

interface AuditLog {
    id: string
    table_name: string
    action: string
    record_id: string | null
    user_id: string | null
    user_name: string | null
    username: string | null
    before_data: string | null
    after_data: string | null
    ip_address: string | null
    created_at: string
}

interface ApiResponse {
    logs: AuditLog[]
    total: number
    page: number
    limit: number
    totalPages: number
    filters: {
        tables: string[]
        users: Array<{ id: string; name: string }>
    }
}

const ACTION_MAP: Record<string, { label: string; variant: 'solid' | 'outline' | 'soft' }> = {
    create: { label: 'Oluşturma', variant: 'solid' },
    update: { label: 'Güncelleme', variant: 'soft' },
    delete: { label: 'Silme', variant: 'outline' },
}

export default function AuditLogsPage() {
    const [data, setData] = useState<ApiResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [table, setTable] = useState('')
    const [action, setAction] = useState('')
    const [userId, setUserId] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [detail, setDetail] = useState<AuditLog | null>(null)

    useEffect(() => {
        loadData()
    }, [page, table, action, userId, startDate, endDate])

    async function loadData() {
        setLoading(true)
        const params = new URLSearchParams()
        params.set('page', String(page))
        if (table) params.set('table', table)
        if (action) params.set('action', action)
        if (userId) params.set('user_id', userId)
        if (startDate) params.set('start', startDate)
        if (endDate) params.set('end', endDate)
        const result = await fetchApi<ApiResponse>(`/api/audit-logs?${params}`)
        setData(result || null)
        setLoading(false)
    }

    function exportCsv() {
        if (!data?.logs?.length) return
        const header = 'Tarih,Kullanıcı,Tablo,İşlem,Kayıt ID,IP\n'
        const rows = data.logs.map(l =>
            `"${l.created_at}","${l.user_name || l.username || ''}","${l.table_name}","${l.action}","${l.record_id || ''}","${l.ip_address || ''}"`
        ).join('\n')
        const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`
        a.click(); URL.revokeObjectURL(url)
    }

    return (
        <AppDashboardLayout title="Denetim Günlüğü" subtitle="Tüm sistem işlemlerinin kaydı" icon={Shield}>
            {/* Filtreler */}
            <Card className="mb-4">
                <CardBody className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <select value={table} onChange={e => { setTable(e.target.value); setPage(1) }}
                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm">
                            <option value="">Tüm Tablolar</option>
                            {data?.filters?.tables?.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={action} onChange={e => { setAction(e.target.value); setPage(1) }}
                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm">
                            <option value="">Tüm İşlemler</option>
                            <option value="create">Oluşturma</option>
                            <option value="update">Güncelleme</option>
                            <option value="delete">Silme</option>
                        </select>
                        <select value={userId} onChange={e => { setUserId(e.target.value); setPage(1) }}
                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm">
                            <option value="">Tüm Kullanıcılar</option>
                            {data?.filters?.users?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1) }}
                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm" />
                        <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1) }}
                            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm" />
                        <div className="flex-1" />
                        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-4 h-4 mr-1" />CSV</Button>
                    </div>
                </CardBody>
            </Card>

            {/* İstatistik */}
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                    Toplam <span className="font-semibold text-gray-900 dark:text-white">{data?.total || 0}</span> kayıt
                </p>
                {(data?.totalPages || 0) > 1 && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-gray-600 dark:text-slate-400">{page} / {data?.totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= (data?.totalPages || 1)}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Log Listesi */}
            {loading ? (
                <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 animate-pulse bg-gray-200 dark:bg-slate-700 rounded-lg" />)}</div>
            ) : !data?.logs?.length ? (
                <Card><CardBody className="p-12 text-center"><p className="text-gray-500">Denetim kaydı bulunamadı</p></CardBody></Card>
            ) : (
                <div className="space-y-1">
                    {data.logs.map(log => (
                        <Card key={log.id} hover>
                            <CardBody className="p-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant={ACTION_MAP[log.action]?.variant || 'outline'} size="sm">
                                                {ACTION_MAP[log.action]?.label || log.action}
                                            </Badge>
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{log.table_name}</span>
                                            {log.record_id && <span className="text-xs text-gray-400">#{log.record_id.slice(0, 8)}</span>}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400">
                                            <span>{log.user_name || log.username || 'Sistem'}</span>
                                            <span>{new Date(log.created_at).toLocaleString('tr-TR')}</span>
                                            {log.ip_address && <span>{log.ip_address}</span>}
                                        </div>
                                    </div>
                                    {(log.before_data || log.after_data) && (
                                        <Button variant="outline" size="sm" onClick={() => setDetail(log)}>
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            {/* Detay Modal */}
            {detail && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
                    <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <CardBody className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Değişiklik Detayı</h3>
                                <Button variant="outline" size="sm" onClick={() => setDetail(null)}>✕</Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                <div><span className="text-gray-500">Tablo:</span> <span className="text-white ml-2">{detail.table_name}</span></div>
                                <div><span className="text-gray-500">İşlem:</span> <span className="text-white ml-2">{ACTION_MAP[detail.action]?.label}</span></div>
                                <div><span className="text-gray-500">Kullanıcı:</span> <span className="text-white ml-2">{detail.user_name || detail.username}</span></div>
                                <div><span className="text-gray-500">Tarih:</span> <span className="text-white ml-2">{new Date(detail.created_at).toLocaleString('tr-TR')}</span></div>
                            </div>
                            {detail.before_data && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-red-400 mb-2">Önceki Değer</h4>
                                    <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto max-h-48">
                                        {JSON.stringify(JSON.parse(detail.before_data), null, 2)}
                                    </pre>
                                </div>
                            )}
                            {detail.after_data && (
                                <div>
                                    <h4 className="text-sm font-medium text-emerald-400 mb-2">Yeni Değer</h4>
                                    <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto max-h-48">
                                        {JSON.stringify(JSON.parse(detail.after_data), null, 2)}
                                    </pre>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            )}
        </AppDashboardLayout>
    )
}
