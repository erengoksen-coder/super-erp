'use client'

import { useCallback, useEffect, useState } from 'react'
import { BarChart3, Download } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

type BaBsRow = {
    account_id: string
    account_name: string
    account_code: string
    tax_number: string | null
    tax_office: string | null
    invoice_count: number
    total_amount: number
}

type BaBsData = {
    period: { year: number; month: number; threshold: number }
    bs: { title: string; rows: BaBsRow[]; total: number; count: number }
    ba: { title: string; rows: BaBsRow[]; total: number; count: number }
}

const MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

export default function BaBsPage() {
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [threshold, setThreshold] = useState(5000)
    const [data, setData] = useState<BaBsData | null>(null)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'bs' | 'ba'>('bs')

    useEffect(() => { document.title = 'BA/BS Formu - LIVASOFA ERP' }, [])

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetchApi(`/api/reports/ba-bs?year=${year}&month=${month}&threshold=${threshold}`)
            setData((res as any)?.data || res as BaBsData)
        } catch (e) {
            console.error('BA/BS yüklenemedi:', e)
        } finally {
            setLoading(false)
        }
    }, [year, month, threshold])

    useEffect(() => { loadData() }, [loadData])

    const formatCurrency = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v || 0)

    const renderTable = (rows: BaBsRow[], title: string, total: number) => (
        <Card>
            <CardHeader title={`${title} (${rows.length} kayıt)`} />
            <CardBody>
                {rows.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">Bu dönemde {threshold.toLocaleString('tr-TR')} TL üstü kayıt yok.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-700 text-left text-gray-400">
                                    <th className="py-3 px-3">#</th>
                                    <th className="py-3 px-3">Cari Kodu</th>
                                    <th className="py-3 px-3">Cari Adı</th>
                                    <th className="py-3 px-3">VKN / TCKN</th>
                                    <th className="py-3 px-3 text-center">Belge Sayısı</th>
                                    <th className="py-3 px-3 text-right">Toplam Tutar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={row.account_id} className="border-b border-gray-800 hover:bg-gray-800/30">
                                        <td className="py-3 px-3 text-gray-400">{i + 1}</td>
                                        <td className="py-3 px-3 text-gray-300 font-mono">{row.account_code || '-'}</td>
                                        <td className="py-3 px-3 text-white font-medium">{row.account_name}</td>
                                        <td className="py-3 px-3 text-gray-300 font-mono">{row.tax_number || '-'}</td>
                                        <td className="py-3 px-3 text-center text-gray-300">{row.invoice_count}</td>
                                        <td className="py-3 px-3 text-right text-white font-bold">{formatCurrency(row.total_amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-600">
                                    <td colSpan={5} className="py-3 px-3 text-right font-bold text-gray-300">TOPLAM:</td>
                                    <td className="py-3 px-3 text-right text-lg font-bold text-blue-400">{formatCurrency(total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </CardBody>
        </Card>
    )

    return (
        <AppDashboardLayout
            title="BA/BS Formu"
            subtitle="Aylık mal ve hizmet alış/satış bildirimleri"
            icon={BarChart3}
        >
            {/* Filtreler */}
            <Card>
                <CardBody className="p-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Yıl</label>
                            <select
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 text-sm"
                            >
                                {[2024, 2025, 2026, 2027].map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Ay</label>
                            <select
                                value={month}
                                onChange={(e) => setMonth(Number(e.target.value))}
                                className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 text-sm"
                            >
                                {MONTHS.map((m, i) => (
                                    <option key={i + 1} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Eşik Tutar (TL)</label>
                            <input
                                type="number"
                                value={threshold}
                                onChange={(e) => setThreshold(Number(e.target.value))}
                                className="bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 text-sm w-28"
                            />
                        </div>
                        <Button variant="solid" color="primary" size="sm" onClick={loadData} disabled={loading}>
                            {loading ? 'Yükleniyor...' : 'Raporu Getir'}
                        </Button>
                    </div>
                </CardBody>
            </Card>

            {/* Tab */}
            <div className="flex gap-2">
                <Button
                    variant={activeTab === 'bs' ? 'solid' : 'outline'}
                    color="primary"
                    size="sm"
                    onClick={() => setActiveTab('bs')}
                >
                    Form Bs – Satışlar ({data?.bs?.count || 0})
                </Button>
                <Button
                    variant={activeTab === 'ba' ? 'solid' : 'outline'}
                    color="primary"
                    size="sm"
                    onClick={() => setActiveTab('ba')}
                >
                    Form Ba – Alımlar ({data?.ba?.count || 0})
                </Button>
            </div>

            {/* Tablo */}
            {data && activeTab === 'bs' && renderTable(data.bs.rows, data.bs.title, data.bs.total)}
            {data && activeTab === 'ba' && renderTable(data.ba.rows, data.ba.title, data.ba.total)}

            {/* Özet Kartlar */}
            {data && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardBody className="p-4 text-center">
                            <div className="text-xs text-gray-400 mb-1">Form Bs – Toplam Satış</div>
                            <div className="text-2xl font-bold text-green-400">{formatCurrency(data.bs.total)}</div>
                            <div className="text-xs text-gray-500 mt-1">{data.bs.count} cari hesap</div>
                        </CardBody>
                    </Card>
                    <Card>
                        <CardBody className="p-4 text-center">
                            <div className="text-xs text-gray-400 mb-1">Form Ba – Toplam Alım</div>
                            <div className="text-2xl font-bold text-orange-400">{formatCurrency(data.ba.total)}</div>
                            <div className="text-xs text-gray-500 mt-1">{data.ba.count} cari hesap</div>
                        </CardBody>
                    </Card>
                </div>
            )}
        </AppDashboardLayout>
    )
}
