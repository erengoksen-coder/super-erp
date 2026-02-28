'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

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

    return (
        <Card variant="elevated" className="overflow-hidden">
            <CardHeader className="px-5 pt-5" title="Alacak Yaşlandırma" subtitle="Vadesi geçen fatura analizi"
                actions={<Clock className="h-5 w-5 text-slate-400" />} />
            <CardBody className="px-5 pb-5 pt-2">
                {/* Toplam */}
                <div className="flex items-center gap-3 mb-4 p-3 bg-gray-800/50 rounded-lg">
                    <AlertTriangle className={`w-5 h-5 ${total > 0 ? 'text-red-400' : 'text-gray-500'}`} />
                    <div>
                        <div className="text-xs text-gray-400">Toplam Vadesi Geçen</div>
                        <div className={`text-lg font-bold ${total > 0 ? 'text-red-400' : 'text-gray-400'}`}>{fmtCur(total)}</div>
                    </div>
                </div>

                {/* Progress bar */}
                {total > 0 && (
                    <div className="flex rounded-full h-3 overflow-hidden mb-4">
                        {bucketData.map(b => {
                            const pct = total > 0 ? (b.data.amount / total * 100) : 0
                            return pct > 0 ? <div key={b.key} className={`${b.color} transition-all`} style={{ width: `${pct}%` }} title={`${b.label}: ${fmtCur(b.data.amount)}`} /> : null
                        })}
                    </div>
                )}

                {/* Bucket kırılımı */}
                <div className="space-y-2">
                    {bucketData.map(b => (
                        <div key={b.key} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${b.color}`} />
                                <span className="text-sm text-gray-300">{b.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500">{b.data.count} fatura</span>
                                <span className={`text-sm font-medium ${b.textColor}`}>{fmtCur(b.data.amount)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* En çok borçlu müşteriler (90+ gün) */}
                {bucketData[3].data.accounts.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-700">
                        <div className="text-xs text-red-400 font-medium mb-2">⚠ 90+ Gün Vadesi Geçen Müşteriler</div>
                        {bucketData[3].data.accounts.slice(0, 3).map((acc, i) => (
                            <div key={i} className="flex justify-between text-sm py-1">
                                <span className="text-gray-300">{acc.account_name}</span>
                                <span className="text-red-400 font-medium">{fmtCur(acc.amount)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    )
}
