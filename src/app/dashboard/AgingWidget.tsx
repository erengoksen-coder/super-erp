'use client'

import { useEffect, useState } from 'react'
import { fetchApi } from '@/lib/api/client'
import { Card, CardBody } from '@/components/ui/Card'

interface AgingData {
    range_0_30: number
    range_30_60: number
    range_60_90: number
    range_90_plus: number
}

const RANGES = [
    { key: 'range_0_30', label: '0-30 Gün', color: 'bg-emerald-500' },
    { key: 'range_30_60', label: '30-60 Gün', color: 'bg-amber-500' },
    { key: 'range_60_90', label: '60-90 Gün', color: 'bg-orange-500' },
    { key: 'range_90_plus', label: '90+ Gün', color: 'bg-red-500' },
] as const

export function AgingWidget() {
    const [aging, setAging] = useState<AgingData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchApi<any>('/api/dashboard/stats')
            .then(data => {
                if (data?.aging) setAging(data.aging)
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <Card className="border border-gray-200/80">
                <CardBody className="p-4">
                    <div className="h-32 animate-pulse bg-gray-200 dark:bg-slate-700 rounded" />
                </CardBody>
            </Card>
        )
    }

    if (!aging) return null

    const total = aging.range_0_30 + aging.range_30_60 + aging.range_60_90 + aging.range_90_plus

    return (
        <Card className="border border-gray-200/80">
            <CardBody className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">
                        Alacak Yaşlandırma
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-slate-500">
                        Toplam: ₺{total.toLocaleString('tr-TR')}
                    </span>
                </div>

                {total === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                        Alacak kaydı bulunmuyor
                    </p>
                ) : (
                    <>
                        {/* Bar */}
                        <div className="flex h-6 rounded-full overflow-hidden mb-3">
                            {RANGES.map(r => {
                                const val = aging[r.key]
                                const pct = total > 0 ? (val / total) * 100 : 0
                                if (pct === 0) return null
                                return (
                                    <div
                                        key={r.key}
                                        className={`${r.color} transition-all duration-500`}
                                        style={{ width: `${pct}%` }}
                                        title={`${r.label}: ₺${val.toLocaleString('tr-TR')} (${pct.toFixed(1)}%)`}
                                    />
                                )
                            })}
                        </div>

                        {/* Legend */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {RANGES.map(r => {
                                const val = aging[r.key]
                                return (
                                    <div key={r.key} className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${r.color} shrink-0`} />
                                        <div className="min-w-0">
                                            <p className="text-xs text-gray-500 dark:text-slate-400">{r.label}</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                ₺{val.toLocaleString('tr-TR')}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </CardBody>
        </Card>
    )
}
