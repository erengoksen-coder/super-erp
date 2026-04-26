'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { DrillDownModal } from '@/components/dashboard/DrillDownModal'

type AgingBucket = { count: number; amount: number; accounts: { account_name: string; amount: number; invoice_count: number }[] }
type AgingData = { aging: { current: AgingBucket; thirtyDay: AgingBucket; sixtyDay: AgingBucket; ninetyPlus: AgingBucket }; totalOverdue: number }

const BUCKETS = [
    { key: 'current', label: '0-30 Gün', color: 'bg-green-500', textColor: 'text-green-400' },
    { key: 'thirtyDay', label: '30-60 Gün', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
    { key: 'sixtyDay', label: '60-90 Gün', color: 'bg-orange-500', textColor: 'text-orange-400' },
    { key: 'ninetyPlus', label: '90+ Gün', color: 'bg-red-500', textColor: 'text-red-400' },
]

export function AgingTable() {
    const [data, setData] = useState<AgingData | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
    const [isDrillDownOpen, setIsDrillDownOpen] = useState(false)

    const load = useCallback(async () => {
        try {
            const res = await fetchApi('/api/reports/aging-report')
            setData((res as any)?.data || null)
        } catch { } finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const fmtCur = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v)

    if (loading) return (
        <Card variant="elevated" className="overflow-hidden">
            <CardBody className="p-5"><div className="animate-pulse space-y-3"><div className="h-4 bg-gray-700 rounded w-32" /><div className="h-32 bg-gray-800 rounded" /></div></CardBody>
        </Card>
    )

    const aging = data?.aging
    const total = data?.totalOverdue || 0
    const bucketData = BUCKETS.map(b => ({
        ...b,
        data: aging ? (aging as any)[b.key] as AgingBucket : { count: 0, amount: 0, accounts: [] }
    }))

    const handleBucketClick = (bucket: string) => {
        setSelectedBucket(bucket)
        setIsDrillDownOpen(true)
    }

    return (
        <Card variant="elevated" className="overflow-hidden h-full flex flex-col">
            <CardHeader className="px-5 pt-5" title="Alacak Yaşlandırma" subtitle="Vadesi geçen toplam bakiye"
                actions={<Clock className="h-5 w-5 text-gray-400 dark:text-slate-400" />} />
            <CardBody className="px-5 pb-5 pt-2 flex-1 flex flex-col">
                {/* Toplam */}
                <div className="flex items-center gap-3 mb-6 p-4 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl">
                    <div className={`p-2 rounded-lg ${total > 0 ? 'bg-red-500/10 text-red-500' : 'bg-gray-500/10 text-gray-500'}`}>
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 tracking-wider">Toplam Vadesi Geçen</div>
                        <div className={`text-2xl font-bold ${total > 0 ? 'text-red-500' : 'text-gray-400 dark:text-slate-400'}`}>{fmtCur(total)}</div>
                    </div>
                </div>

                {/* Gelişmiş Progress Bar */}
                {total > 0 && (
                    <div className="flex rounded-full h-4 overflow-hidden mb-6 border border-[var(--border)]">
                        {bucketData.map(b => {
                            const pct = total > 0 ? (b.data.amount / total * 100) : 0
                            return pct > 0 ? (
                                <button 
                                    key={b.key} 
                                    className={`${b.color} hover:brightness-110 transition-all opacity-80 hover:opacity-100`}
                                    style={{ width: `${pct}%` }} 
                                    title={`${b.label}: ${fmtCur(b.data.amount)}`}
                                    onClick={() => handleBucketClick(b.key)}
                                />
                            ) : null
                        })}
                    </div>
                )}

                {/* Bucket Listesi */}
                <div className="space-y-1 mt-auto">
                    {bucketData.map(b => (
                        <button 
                            key={b.key} 
                            onClick={() => handleBucketClick(b.key)}
                            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--surface-light)] transition-colors group text-left border border-transparent hover:border-[var(--border)]"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${b.color} shadow-sm`} />
                                <div>
                                    <div className="text-sm font-medium text-[var(--foreground)] opacity-80 group-hover:opacity-100">{b.label}</div>
                                    <div className="text-[10px] text-gray-500">{b.data.count} Fatura</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${b.textColor}`}>{fmtCur(b.data.amount)}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Quick Info */}
                <div className="mt-4 pt-4 border-t border-[var(--border)] text-[10px] text-gray-500 flex justify-center italic">
                    Detaylı müşteri listesi için tıklayın
                </div>
            </CardBody>

            {/* Drill-down Modal */}
            <DrillDownModal 
                isOpen={isDrillDownOpen} 
                onClose={() => setIsDrillDownOpen(false)} 
                type="aging" 
                bucket={selectedBucket} 
                month={null}
            />
        </Card>
    )
}
