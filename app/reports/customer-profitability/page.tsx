'use client'

import { useState, useEffect } from 'react'
import { Users, TrendingUp, DollarSign, CreditCard, Search, ArrowUpDown } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { fetchApi } from '@/lib/api/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface CustomerRow {
    account_id: string
    customer_name: string
    account_type: string
    total_sales: number
    shipment_count: number
    balance: number
    total_paid: number
    collection_rate: number
}

interface Summary {
    total_customers: number
    total_revenue: number
    total_collected: number
    total_receivable: number
    avg_collection_rate: number
}

export default function CustomerProfitabilityPage() {
    const [customers, setCustomers] = useState<CustomerRow[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [sortBy, setSortBy] = useState<'total_sales' | 'balance' | 'collection_rate'>('total_sales')

    useEffect(() => {
        fetchApi<{ customers: CustomerRow[]; summary: Summary }>('/api/reports/customer-profitability')
            .then(data => {
                setCustomers(data?.customers || [])
                setSummary(data?.summary || null)
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const filtered = customers
        .filter(c => !search || c.customer_name?.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))

    const top10 = filtered.slice(0, 10)

    return (
        <AppDashboardLayout title="Müşteri Karlılık Raporu" subtitle="Müşteri bazlı satış, tahsilat ve karlılık analizi" icon={Users}>
            {/* Özet Kartları */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardBody className="p-4 text-center">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Toplam Müşteri</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary?.total_customers || 0}</p>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="p-4 text-center">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Toplam Gelir</p>
                        <p className="text-2xl font-bold text-emerald-500">₺{(summary?.total_revenue || 0).toLocaleString('tr-TR')}</p>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="p-4 text-center">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Tahsil Edilen</p>
                        <p className="text-2xl font-bold text-blue-500">₺{(summary?.total_collected || 0).toLocaleString('tr-TR')}</p>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="p-4 text-center">
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Açık Bakiye</p>
                        <p className="text-2xl font-bold text-amber-500">₺{(summary?.total_receivable || 0).toLocaleString('tr-TR')}</p>
                    </CardBody>
                </Card>
            </div>

            {/* Top 10 Müşteri Grafiği */}
            {top10.length > 0 && (
                <Card className="mb-6">
                    <CardBody className="p-4">
                        <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-4">
                            En Yüksek Cirolu 10 Müşteri
                        </h3>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={top10.map(c => ({
                                    name: c.customer_name?.length > 15 ? c.customer_name.slice(0, 15) + '...' : c.customer_name,
                                    Satış: Math.round(c.total_sales),
                                    Tahsilat: Math.round(c.total_paid)
                                }))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#94a3b8" tickFormatter={(v: number) => `₺${(v / 1000).toFixed(0)}K`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                                        formatter={(value: number) => [`₺${value.toLocaleString('tr-TR')}`, '']}
                                    />
                                    <Bar dataKey="Satış" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Tahsilat" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Arama & Sıralama */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input placeholder="Müşteri ara..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                    <option value="total_sales">Ciro (Yüksek → Düşük)</option>
                    <option value="balance">Bakiye (Yüksek → Düşük)</option>
                    <option value="collection_rate">Tahsilat Oranı</option>
                </select>
            </div>

            {/* Müşteri Listesi */}
            {loading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse bg-gray-200 dark:bg-slate-700 rounded-lg" />)}</div>
            ) : filtered.length === 0 ? (
                <Card><CardBody className="p-12 text-center"><p className="text-gray-500">Müşteri bulunamadı</p></CardBody></Card>
            ) : (
                <div className="space-y-2">
                    {filtered.map(c => (
                        <Card key={c.account_id} hover>
                            <CardBody className="p-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-indigo-500/10">
                                        <Users className="w-5 h-5 text-indigo-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900 dark:text-white truncate">{c.customer_name}</p>
                                            <Badge variant={c.account_type === 'customer' ? 'solid' : 'outline'} size="sm">
                                                {c.account_type === 'customer' ? 'Müşteri' : c.account_type === 'supplier' ? 'Tedarikçi' : c.account_type}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                            {c.shipment_count} sevkiyat
                                        </p>
                                    </div>
                                    <div className="text-right space-y-0.5">
                                        <p className="text-sm font-semibold text-emerald-500">₺{c.total_sales.toLocaleString('tr-TR')}</p>
                                        <p className="text-xs text-gray-500">Bakiye: <span className={c.balance > 0 ? 'text-amber-500' : 'text-emerald-500'}>₺{c.balance.toLocaleString('tr-TR')}</span></p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-bold ${c.collection_rate >= 80 ? 'text-emerald-500' : c.collection_rate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                            %{c.collection_rate}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">Tahsilat</p>
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
