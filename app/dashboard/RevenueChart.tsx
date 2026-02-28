'use client'

import { useCallback, useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

type MonthData = { year: string; month: string; revenue: number; invoice_count: number }

export function RevenueChart() {
    const [data, setData] = useState<{ months: MonthData[]; comparison: any } | null>(null)
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        try {
            const res = await fetchApi('/api/dashboard-stats')
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

    const months = data?.months || []
    const maxRevenue = Math.max(...months.map(m => m.revenue), 1)
    const comp = data?.comparison

    return (
        <Card variant="elevated" className="overflow-hidden">
            <CardHeader className="px-5 pt-5" title="Aylık Ciro" subtitle="Son 12 aylık gelir grafiği"
                actions={<DollarSign className="h-5 w-5 text-slate-400" />} />
            <CardBody className="px-5 pb-5 pt-2">
                {/* Karşılaştırma */}
                {comp && (
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1 bg-gray-800/50 rounded-lg p-3">
                            <div className="text-xs text-gray-400">Bu Ay</div>
                            <div className="text-lg font-bold text-white">{fmtCur(comp.thisMonth?.revenue || 0)}</div>
                            <div className="text-xs text-gray-500">{comp.thisMonth?.count || 0} fatura</div>
                        </div>
                        <div className="flex-1 bg-gray-800/50 rounded-lg p-3">
                            <div className="text-xs text-gray-400">Geçen Ay</div>
                            <div className="text-lg font-bold text-white">{fmtCur(comp.lastMonth?.revenue || 0)}</div>
                            {comp.changePercent && (
                                <div className={`flex items-center gap-1 text-xs ${Number(comp.changePercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {Number(comp.changePercent) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                    %{comp.changePercent}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Grafik */}
                {months.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">Henüz fatura verisi yok</div>
                ) : (
                    <div className="flex items-end gap-1.5 h-32">
                        {months.map((m, i) => {
                            const h = (m.revenue / maxRevenue) * 100
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center group" title={`${MONTH_NAMES[parseInt(m.month) - 1]} ${m.year}: ${fmtCur(m.revenue)}`}>
                                    <div className="w-full relative" style={{ height: '100px' }}>
                                        <div
                                            className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-300 group-hover:from-blue-500 group-hover:to-blue-300"
                                            style={{ height: `${Math.max(h, 3)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-500 mt-1">{MONTH_NAMES[parseInt(m.month) - 1]}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardBody>
        </Card>
    )
}
