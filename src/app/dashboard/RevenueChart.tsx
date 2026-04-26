'use client'

import { useCallback, useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { DrillDownModal } from '@/components/dashboard/DrillDownModal'

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

type MonthData = { month: string; total: number }

export function RevenueChart() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
    const [isDrillDownOpen, setIsDrillDownOpen] = useState(false)

    const load = useCallback(async () => {
        try {
            const res = await fetchApi('/api/dashboard/stats')
            setData(res || null)
        } catch { } finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const fmtCur = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v)

    if (loading) return (
        <Card variant="elevated" className="overflow-hidden">
            <CardBody className="p-5"><div className="animate-pulse space-y-3"><div className="h-4 bg-gray-700 rounded w-32" /><div className="h-32 bg-gray-800 rounded" /></div></CardBody>
        </Card>
    )

    const salesTrend = data?.salesTrend || []
    
    // Grafiği Recharts formatına dönüştür
    const chartData = salesTrend.map((item: any) => {
        const [year, month] = item.month.split('-')
        return {
            name: `${MONTH_NAMES[parseInt(month) - 1]} ${year}`,
            value: item.total,
            originalMonth: item.month
        }
    })

    const handleBarClick = (data: any) => {
        if (data && data.activePayload && data.activePayload[0]) {
            const payload = data.activePayload[0].payload
            setSelectedMonth(payload.originalMonth)
            setIsDrillDownOpen(true)
        }
    }

    return (
        <Card variant="elevated" className="overflow-hidden">
            <CardHeader className="px-5 pt-5" title="Aylık Ciro" subtitle="Son 6 aylık sevkiyat trendi"
                actions={<DollarSign className="h-5 w-5 text-gray-400 dark:text-slate-400" />} />
            <CardBody className="px-5 pb-5 pt-2">
                {/* Özet Veriler */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1 bg-[var(--surface-light)] border border-[var(--border)] rounded-xl p-3">
                        <div className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-500 mb-1 tracking-wider">Bu Ay (Sevkiyat)</div>
                        <div className="text-xl font-bold text-[var(--foreground)] leading-none mb-1">{fmtCur(data?.salesThisMonth || 0)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                        {data?.salesLastMonth > 0 && (
                            <div className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${data.salesThisMonth >= data.salesLastMonth ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {data.salesThisMonth >= data.salesLastMonth ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                %{Math.round((Math.abs(data.salesThisMonth - data.salesLastMonth) / data.salesLastMonth) * 100)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recharts Grafik */}
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} onClick={handleBarClick} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--foreground)', fontSize: 10, opacity: 0.6 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--foreground)', fontSize: 10, opacity: 0.6 }} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} />
                            <Tooltip 
                                cursor={{ fill: 'var(--primary)', opacity: 0.05 }}
                                contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px', color: 'var(--foreground)', boxShadow: 'var(--card-shadow)' }}
                                itemStyle={{ color: 'var(--primary)' }}
                                formatter={(value: number) => [fmtCur(value), 'Ciro']}
                                labelStyle={{ color: 'var(--foreground)', opacity: 0.8, marginBottom: '4px', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} className="cursor-pointer">
                                {chartData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill="var(--primary)" fillOpacity={index === chartData.length - 1 ? 1 : 0.7} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-4 text-[10px] text-gray-500 flex items-center gap-2 justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary" /> Detaylı veri için barın üzerine tıklayın
                </div>
            </CardBody>

            {/* Drill-down Modal */}
            <DrillDownModal 
                isOpen={isDrillDownOpen} 
                onClose={() => setIsDrillDownOpen(false)} 
                type="revenue" 
                month={selectedMonth} 
            />
        </Card>
    )
}
