'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Plus, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { fetchApi } from '@/lib/api/client'

interface JournalEntry {
    id: string
    entry_number: string
    entry_date: string
    description: string
    total_debit: number
    total_credit: number
    status: string
    line_count: number
    created_at: string
}

export default function AccountingPage() {
    const [entries, setEntries] = useState<JournalEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [expanded, setExpanded] = useState<string | null>(null)

    useEffect(() => { load() }, [])

    async function load() {
        setLoading(true)
        const data = await fetchApi<JournalEntry[]>('/api/accounting/journal-entries')
        setEntries(Array.isArray(data) ? data : [])
        setLoading(false)
    }

    const totalDebit = entries.reduce((s, e) => s + (e.total_debit || 0), 0)
    const totalCredit = entries.reduce((s, e) => s + (e.total_credit || 0), 0)

    return (
        <AppDashboardLayout title="Muhasebe Entegrasyonu" subtitle="Yevmiye kayıtları ve muhasebe fişleri" icon={BookOpen}>
            {/* Özet */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <Card><CardBody className="p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Toplam Fiş</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{entries.length}</p>
                </CardBody></Card>
                <Card><CardBody className="p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Toplam Borç</p>
                    <p className="text-2xl font-bold text-emerald-500">₺{totalDebit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
                </CardBody></Card>
                <Card><CardBody className="p-4 text-center">
                    <p className="text-xs text-gray-500 dark:text-slate-400">Toplam Alacak</p>
                    <p className="text-2xl font-bold text-blue-500">₺{totalCredit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</p>
                </CardBody></Card>
            </div>

            {/* Entegrasyon Durumu */}
            <Card className="mb-6">
                <CardBody className="p-4">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-3">Desteklenen Programlar</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['Logo', 'Mikro', 'Luca', 'Paraşüt'].map(prog => (
                            <div key={prog} className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-sm text-gray-700 dark:text-slate-300">{prog}</span>
                            </div>
                        ))}
                    </div>
                </CardBody>
            </Card>

            {/* Yevmiye Listesi */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Yevmiye Kayıtları</h3>
                <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-1" />Yenile</Button>
            </div>

            {loading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 animate-pulse bg-gray-200 dark:bg-slate-700 rounded-lg" />)}</div>
            ) : entries.length === 0 ? (
                <Card><CardBody className="p-12 text-center">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Henüz yevmiye kaydı yok</p>
                    <p className="text-xs text-gray-400 mt-1">Fatura oluşturulduğunda otomatik yevmiye kaydı oluşturulur</p>
                </CardBody></Card>
            ) : (
                <div className="space-y-2">
                    {entries.map(entry => (
                        <Card key={entry.id} hover>
                            <CardBody className="p-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {entry.entry_number || `#${entry.id.slice(0, 8)}`}
                                            </span>
                                            <Badge variant="outline" size="sm">{entry.line_count} satır</Badge>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {entry.description || 'Açıklama yok'} • {new Date(entry.entry_date || entry.created_at).toLocaleDateString('tr-TR')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-mono text-emerald-500">₺{(entry.total_debit || 0).toLocaleString('tr-TR')}</p>
                                        <p className="text-xs text-gray-400">Borç</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-mono text-blue-500">₺{(entry.total_credit || 0).toLocaleString('tr-TR')}</p>
                                        <p className="text-xs text-gray-400">Alacak</p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}
        </AppDashboardLayout>
    )
}
