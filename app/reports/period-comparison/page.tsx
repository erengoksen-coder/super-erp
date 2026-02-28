'use client'

import { useCallback, useEffect, useState } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Minus, ShoppingCart, FileText, Truck, Factory, Users, ClipboardCheck, DollarSign } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

type Metric = {
    name: string; thisMonth: number; lastMonth: number
    change: string | null; icon: string; isCurrency?: boolean
}

const ICON_MAP: Record<string, any> = {
    ShoppingCart, FileText, Truck, Factory, Users, ClipboardCheck, DollarSign
}

const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="animate-pulse bg-gray-800/50 rounded-xl p-5 space-y-3">
                <div className="h-3 bg-gray-700 rounded w-24" />
                <div className="h-8 bg-gray-700 rounded w-20" />
                <div className="h-3 bg-gray-700 rounded w-16" />
            </div>
        ))}
    </div>
)

export default function PeriodComparisonPage() {
    const [metrics, setMetrics] = useState<Metric[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { document.title = 'Dönem Karşılaştırma - LIVASOFA ERP' }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetchApi('/api/reports/period-comparison')
            setMetrics((res as any)?.data?.metrics || [])
        } catch { } finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const fmtNum = (v: number, isCurrency?: boolean) => {
        if (isCurrency) return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v)
        return v.toLocaleString('tr-TR')
    }

    const now = new Date()
    const thisMonthName = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
    const lastMonthName = lastMonth.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })

    return (
        <AppDashboardLayout title="Dönem Karşılaştırma" subtitle={`${thisMonthName} vs ${lastMonthName}`} icon={BarChart3}>
            {loading ? <LoadingSkeleton /> : (
                <div className="space-y-6">
                    {/* Metrik kartları */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {metrics.map((m, i) => {
                            const Icon = ICON_MAP[m.icon] || BarChart3
                            const ch = m.change ? parseFloat(m.change) : 0
                            const isUp = ch > 0
                            const isDown = ch < 0
                            const gradient = isUp ? 'from-green-900/30 to-green-800/10 border-green-800/40'
                                : isDown ? 'from-red-900/30 to-red-800/10 border-red-800/40'
                                    : 'from-gray-800/30 to-gray-700/10 border-gray-700/40'

                            return (
                                <div key={i} className={`bg-gradient-to-br ${gradient} border rounded-xl p-5 transition-all hover:scale-[1.02]`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Icon className="w-4 h-4 text-gray-400" />
                                            <span className="text-xs font-medium text-gray-400">{m.name}</span>
                                        </div>
                                        {m.change && (
                                            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-900/50 text-green-400' : isDown ? 'bg-red-900/50 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                                                {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                                %{Math.abs(ch).toFixed(1)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Bu ay */}
                                    <div className="text-2xl font-bold text-white mb-2">{fmtNum(m.thisMonth, m.isCurrency)}</div>

                                    {/* Geçen ay */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Geçen ay</span>
                                        <span className="text-sm text-gray-400">{fmtNum(m.lastMonth, m.isCurrency)}</span>
                                    </div>

                                    {/* İlerleme çubuğu */}
                                    <div className="mt-2 flex rounded-full h-1.5 bg-gray-700/50 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${isUp ? 'bg-green-500' : isDown ? 'bg-red-500' : 'bg-gray-500'}`}
                                            style={{ width: `${Math.min(m.lastMonth > 0 ? (m.thisMonth / m.lastMonth * 100) : (m.thisMonth > 0 ? 100 : 0), 200) / 2}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Tablo görünümü */}
                    <Card>
                        <CardHeader title="Detaylı Karşılaştırma" />
                        <CardBody>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-700 text-left text-gray-400">
                                            <th className="py-3 px-3">Metrik</th>
                                            <th className="py-3 px-3 text-right">{thisMonthName}</th>
                                            <th className="py-3 px-3 text-right">{lastMonthName}</th>
                                            <th className="py-3 px-3 text-right">Fark</th>
                                            <th className="py-3 px-3 text-right">Değişim</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {metrics.map((m, i) => {
                                            const diff = m.thisMonth - m.lastMonth
                                            const ch = m.change ? parseFloat(m.change) : 0
                                            return (
                                                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                                                    <td className="py-3 px-3 text-white font-medium">{m.name}</td>
                                                    <td className="py-3 px-3 text-right text-white font-bold">{fmtNum(m.thisMonth, m.isCurrency)}</td>
                                                    <td className="py-3 px-3 text-right text-gray-400">{fmtNum(m.lastMonth, m.isCurrency)}</td>
                                                    <td className={`py-3 px-3 text-right font-medium ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                                        {diff > 0 ? '+' : ''}{fmtNum(diff, m.isCurrency)}
                                                    </td>
                                                    <td className="py-3 px-3 text-right">
                                                        {m.change ? (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${ch > 0 ? 'bg-green-900/40 text-green-400' : ch < 0 ? 'bg-red-900/40 text-red-400' : 'text-gray-400'}`}>
                                                                {ch > 0 ? <TrendingUp className="w-3 h-3" /> : ch < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                                                %{Math.abs(ch).toFixed(1)}
                                                            </span>
                                                        ) : <span className="text-gray-500">-</span>}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            )}
        </AppDashboardLayout>
    )
}
