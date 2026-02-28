'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Star, List, CheckCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { toast } from '@/lib/notify'

type PriceList = {
    id: string; name: string; code: string | null; description: string | null
    currency: string; is_default: number; status: string; item_count: number
    valid_from: string | null; valid_until: string | null
}

const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-3 p-4">
        {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 items-center">
                <div className="h-4 bg-gray-700 rounded w-32" />
                <div className="h-4 bg-gray-700 rounded w-16" />
                <div className="h-4 bg-gray-700 rounded w-40" />
                <div className="h-4 bg-gray-700 rounded w-16 ml-auto" />
            </div>
        ))}
    </div>
)

export default function PriceListsPage() {
    const [lists, setLists] = useState<PriceList[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { document.title = 'Fiyat Listeleri - LIVASOFA ERP' }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await fetchApi('/api/price-lists')
            setLists(Array.isArray(data) ? data : (data as any)?.data || [])
        } catch (e) { console.error(e) } finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const stats = useMemo(() => {
        const active = lists.filter(l => l.status === 'active').length
        const inactive = lists.filter(l => l.status !== 'active').length
        const totalProducts = lists.reduce((s, l) => s + (l.item_count || 0), 0)
        const defaultList = lists.find(l => l.is_default)
        return { active, inactive, totalProducts, defaultList: defaultList?.name || '-' }
    }, [lists])

    const handleDelete = async (id: string) => {
        if (!confirm('Bu fiyat listesini silmek istediğinize emin misiniz?')) return
        try {
            await fetchApi(`/api/price-lists/${id}`, { method: 'DELETE' })
            toast.success('Fiyat listesi silindi')
            load()
        } catch (e: any) { toast.error(e.message || 'Hata') }
    }

    const handleToggle = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
        try {
            await fetchApi(`/api/price-lists/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
            toast.success(`Fiyat listesi ${newStatus === 'active' ? 'aktif' : 'pasif'} yapıldı`)
            load()
        } catch (e: any) { toast.error(e.message || 'Hata') }
    }

    const fmt = (d: string | null) => { if (!d) return '-'; try { return new Intl.DateTimeFormat('tr-TR').format(new Date(d)) } catch { return d } }

    return (
        <AppDashboardLayout title="Fiyat Listeleri" subtitle="Müşteri grubu bazlı fiyatlandırma" icon={Tag}>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-1"><List className="w-3.5 h-3.5" />Toplam Liste</div>
                    <div className="text-xl font-bold text-white">{lists.length}</div>
                </div>
                <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-400 text-xs font-medium mb-1"><CheckCircle className="w-3.5 h-3.5" />Aktif</div>
                    <div className="text-xl font-bold text-white">{stats.active}</div>
                </div>
                <div className="bg-gradient-to-br from-cyan-900/40 to-cyan-800/20 border border-cyan-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-medium mb-1"><Tag className="w-3.5 h-3.5" />Toplam Ürün</div>
                    <div className="text-xl font-bold text-white">{stats.totalProducts}</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-yellow-400 text-xs font-medium mb-1"><Star className="w-3.5 h-3.5" />Varsayılan</div>
                    <div className="text-sm font-bold text-white truncate">{stats.defaultList}</div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-end mb-4">
                <Link href="/price-lists/new">
                    <Button variant="solid" color="primary" size="sm"><Plus className="w-4 h-4 mr-1" />Yeni Fiyat Listesi</Button>
                </Link>
            </div>

            <Card>
                <CardHeader title={`Fiyat Listeleri (${lists.length})`} />
                <CardBody>
                    {loading ? <LoadingSkeleton /> :
                        lists.length === 0 ? (
                            <div className="text-center py-16">
                                <Tag className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-gray-400 mb-1">Henüz fiyat listesi yok</h3>
                                <p className="text-sm text-gray-500 mb-4">Farklı müşteri gruplarına özel fiyatlar tanımlayın</p>
                                <Link href="/price-lists/new">
                                    <Button variant="solid" color="primary" size="sm"><Plus className="w-4 h-4 mr-1" />Yeni Liste Oluştur</Button>
                                </Link>
                            </div>
                        ) :
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-700 text-left text-gray-400">
                                            <th className="py-3 px-3">Ad</th>
                                            <th className="py-3 px-3">Kod</th>
                                            <th className="py-3 px-3">Açıklama</th>
                                            <th className="py-3 px-3 text-center">Ürün Sayısı</th>
                                            <th className="py-3 px-3">Geçerlilik</th>
                                            <th className="py-3 px-3">Durum</th>
                                            <th className="py-3 px-3 text-center">Varsayılan</th>
                                            <th className="py-3 px-3 text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lists.map(pl => (
                                            <tr key={pl.id} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                                                <td className="py-3 px-3 text-white font-medium">{pl.name}</td>
                                                <td className="py-3 px-3 text-gray-300 font-mono">{pl.code || '-'}</td>
                                                <td className="py-3 px-3 text-gray-400 text-xs max-w-[200px] truncate">{pl.description || '-'}</td>
                                                <td className="py-3 px-3 text-center"><span className="bg-gray-700/50 px-2 py-0.5 rounded text-gray-300">{pl.item_count}</span></td>
                                                <td className="py-3 px-3 text-gray-300 text-xs">{fmt(pl.valid_from)} ~ {fmt(pl.valid_until)}</td>
                                                <td className="py-3 px-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${pl.status === 'active' ? 'bg-green-900/30 text-green-400 border-green-600' : 'bg-gray-700/30 text-gray-400 border-gray-600'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${pl.status === 'active' ? 'bg-green-400' : 'bg-gray-500'}`} />
                                                        {pl.status === 'active' ? 'Aktif' : 'Pasif'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center">{pl.is_default ? <Star className="w-4 h-4 text-yellow-400 mx-auto fill-yellow-400" /> : <span className="text-gray-600">-</span>}</td>
                                                <td className="py-3 px-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="sm" className={`${pl.status === 'active' ? 'text-orange-400 hover:bg-orange-900/20' : 'text-green-400 hover:bg-green-900/20'}`} onClick={() => handleToggle(pl.id, pl.status)}>
                                                            {pl.status === 'active' ? <><ToggleRight className="w-4 h-4 mr-1" />Pasif</> : <><ToggleLeft className="w-4 h-4 mr-1" />Aktif</>}
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-900/20" onClick={() => handleDelete(pl.id)}>
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>}
                </CardBody>
            </Card>
        </AppDashboardLayout>
    )
}
