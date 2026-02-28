'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Factory,
    TrendingUp,
    Clock,
    AlertCircle,
    DollarSign,
    BarChart3,
    RefreshCw,
    Target,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    PieChart,
    Layers,
    Users,
    FastForward,
    AlertTriangle,
    PackageSearch,
    Truck,
    ShoppingBag,
    CheckSquare,
    Plus,
    FilePlus,
    CheckCircle2
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatNumber } from '@/lib/utils/numberFormat'

export default function ProductionDashboard() {
    const router = useRouter()
    const [summary, setSummary] = useState<any>(null)
    const [efficiency, setEfficiency] = useState<any[]>([])
    const [profitability, setProfitability] = useState<any[]>([])
    const [delays, setDelays] = useState<any[]>([])
    const [trends, setTrends] = useState<any[]>([])
    const [scrap, setScrap] = useState<any[]>([])
    const [usage, setUsage] = useState<any[]>([])
    const [operators, setOperators] = useState<any[]>([])
    const [forecast, setForecast] = useState<any[]>([])
    const [requirements, setRequirements] = useState<any[]>([])
    const [shipment, setShipment] = useState<any[]>([])
    const [recentShipments, setRecentShipments] = useState<any[]>([])
    const [selectedOrders, setSelectedOrders] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    const loadData = async () => {
        setLoading(true)
        try {
            const results = await Promise.all([
                fetchApi('/api/production/reports?type=summary'),
                fetchApi('/api/production/reports?type=efficiency'),
                fetchApi('/api/production/reports?type=profitability'),
                fetchApi('/api/production/reports?type=delays'),
                fetchApi('/api/production/reports?type=trends'),
                fetchApi('/api/production/reports?type=scrap'),
                fetchApi('/api/production/reports?type=usage'),
                fetchApi('/api/production/reports?type=operators'),
                fetchApi('/api/production/reports?type=forecast'),
                fetchApi('/api/production/reports?type=requirements'),
                fetchApi('/api/production/reports?type=shipment'),
                fetchApi('/api/production/reports?type=recent_shipments')
            ]) as any[]

            const [s, e, p, d, t, sc, u, op, f, r, sh, res] = results

            setSummary(s)
            setEfficiency(e || [])
            setProfitability(p || [])
            setDelays(d || [])
            setTrends(t || [])
            setScrap(sc || [])
            setUsage(u || [])
            setOperators(op || [])
            setForecast(f || [])
            setRequirements(r || [])
            setShipment(sh || [])
            setRecentShipments(res || [])
        } catch (err) {
            toast.error('Veriler yüklenirken bir hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const createPackingList = async () => {
        if (selectedOrders.length === 0) {
            toast.error('Lütfen sevkiyat için en az bir emir seçin')
            return
        }

        try {
            setLoading(true)
            const result = await fetchApi('/api/production/shipment/packing-list', {
                method: 'POST',
                body: JSON.stringify({ order_ids: selectedOrders })
            }) as any
            toast.success(result.message || 'Sevkiyat ve çeki listesi oluşturuldu')
            setSelectedOrders([])
            loadData()
        } catch (err: any) {
            toast.error(err.message || 'İşlem başarısız')
        } finally {
            setLoading(false)
        }
    }

    const createWaybill = async (shipmentId: string) => {
        try {
            setLoading(true)
            const result = await fetchApi('/api/waybills', {
                method: 'POST',
                body: JSON.stringify({ shipment_id: shipmentId })
            }) as any
            toast.success(result.waybill?.waybill_number + ' numaralı irsaliye oluşturuldu')
            loadData()
        } catch (err: any) {
            toast.error(err.message || 'İrsaliye oluşturulamadı')
        } finally {
            setLoading(false)
        }
    }

    const toggleOrderSelection = (id: string) => {
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    useEffect(() => {
        loadData()
    }, [])

    return (
        <AppDashboardLayout
            title="Üretim Performans Gösterge Paneli"
            subtitle="Maliyetler, verimlilik ve tahminleme analizleri" // Updated subtitle
            icon={BarChart3}
            actions={
                <div className="flex gap-2"> {/* Wrapped button in div */}
                    <Button onClick={loadData} disabled={loading} variant="outline" size="sm">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Yenile
                    </Button>
                </div>
            }
        >
            {/* Üst Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-500/20 relative overflow-hidden group">
                    <CardBody className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <DollarSign className="w-6 h-6 text-blue-400" />
                            </div>
                            <span className="flex items-center text-xs font-medium text-emerald-400">
                                <ArrowUpRight className="w-3 h-3 mr-1" />
                                +12%
                            </span>
                        </div>
                        <h3 className="text-gray-400 text-sm font-medium">Toplam Üretim Maliyeti</h3>
                        <p className="text-2xl font-bold text-white mt-1">
                            {formatCurrency(summary?.total_cost || 0)}
                        </p>
                        <div className="mt-4 flex gap-4 text-xs font-mono">
                            <span className="text-gray-500">Malzeme: <span className="text-blue-300">{formatCurrency(summary?.total_material_cost || 0)}</span></span>
                            <span className="text-gray-500">İşçilik: <span className="text-indigo-300">{formatCurrency(summary?.total_labor_cost || 0)}</span></span>
                        </div>
                    </CardBody>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500/20 group-hover:bg-blue-500/40 transition-all"></div>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 border-emerald-500/20 relative overflow-hidden group">
                    <CardBody className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-emerald-500/20 rounded-lg">
                                <Target className="w-6 h-6 text-emerald-400" />
                            </div>
                            <span className="flex items-center text-xs font-medium text-emerald-400">
                                <ArrowUpRight className="w-3 h-3 mr-1" />
                                +5%
                            </span>
                        </div>
                        <h3 className="text-gray-400 text-sm font-medium">Birim Başı Ort. Maliyet</h3>
                        <p className="text-2xl font-bold text-white mt-1">
                            {formatCurrency(summary?.avg_cost_per_unit || 0)}
                        </p>
                        <p className="text-xs text-emerald-500/80 mt-2">Hedeflenen maliyetin %2 altında</p>
                    </CardBody>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/20 group-hover:bg-emerald-500/40 transition-all"></div>
                </Card>

                {/* New card for Tahmini İş Yükü */}
                <Card className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 border-indigo-500/20 relative overflow-hidden group">
                    <CardBody className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <Clock className="w-6 h-6 text-indigo-400" />
                            </div>
                        </div>
                        <h3 className="text-gray-400 text-sm font-medium">Tahmini İş Yükü</h3>
                        <p className="text-2xl font-bold text-white mt-1">
                            {forecast?.length || 0} <span className="text-sm font-normal text-gray-400 ml-1">aktif emir</span>
                        </p>
                        <p className="text-xs text-indigo-400/80 mt-2">Gelecek 7 gün için yoğunluk</p>
                    </CardBody>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500/20 group-hover:bg-indigo-500/40 transition-all"></div>
                </Card>

                <Card className="bg-gradient-to-br from-rose-900/20 to-rose-800/10 border-rose-500/20 relative overflow-hidden group">
                    <CardBody className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-rose-500/20 rounded-lg">
                                <AlertCircle className="w-6 h-6 text-rose-400" />
                            </div>
                        </div>
                        <h3 className="text-gray-400 text-sm font-medium">Geciken Emirler</h3>
                        <p className="text-2xl font-bold text-white mt-1">
                            {delays?.length || 0} <span className="text-sm font-normal text-gray-400 ml-1">adet</span>
                        </p>
                        <div className="mt-4 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-rose-500 h-full transition-all duration-1000"
                                style={{ width: `${Math.min(((delays?.length || 0) / (summary?.order_count || 1)) * 100, 100)}%` }}
                            ></div>
                        </div>
                    </CardBody>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500/20 group-hover:bg-rose-500/40 transition-all"></div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Aylık Üretim Trendi */}
                <Card className="lg:col-span-2 bg-gray-900/40 backdrop-blur-md border-gray-800">
                    <CardHeader
                        title="Aylık Üretim Akışı"
                        subtitle="Üretilen miktar ve maliyet değişimi"
                        icon={Activity}
                    />
                    <CardBody className="p-6 h-[250px] flex items-end gap-2 px-8">
                        {trends.map((t, idx) => {
                            const maxQty = Math.max(...trends.map(x => x.total_quantity)) || 1
                            const itemHeight = (t.total_quantity / maxQty) * 100
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-help relative">
                                    <div className="hidden group-hover:block absolute bottom-full mb-2 p-2 bg-gray-800 border border-gray-700 rounded text-[10px] text-white z-20 shadow-xl whitespace-nowrap">
                                        {t.month}: {t.total_quantity} ADT<br />{formatCurrency(t.total_cost)}
                                    </div>
                                    <div
                                        className="w-full bg-blue-500/20 group-hover:bg-blue-500/40 border-t-2 border-blue-400 rounded-t-sm transition-all duration-700"
                                        style={{ height: `${itemHeight}%` }}
                                    ></div>
                                    <span className="text-[10px] text-gray-500 rotate-45 mt-4 origin-left whitespace-nowrap">{t.month}</span>
                                </div>
                            )
                        })}
                        {trends.length === 0 && <div className="w-full text-center text-gray-500 flex items-center justify-center">Trend verisi henüz oluşmadı</div>}
                    </CardBody>
                </Card>

                {/* New card for Tahmini Tamamlanma Zamanları */}
                <Card className="bg-gray-900/40 backdrop-blur-md border-gray-800">
                    <CardHeader
                        title="Tahmini Tamamlanma"
                        subtitle="Geçmiş verilere dayalı projeksiyon"
                        icon={FastForward} // Changed icon to FastForward
                    />
                    <CardBody className="p-5 space-y-4">
                        {forecast.map((f, idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-200">{f.order_number}</span>
                                    <span className="text-[10px] text-gray-500 truncate max-w-[120px]">{f.product_name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-bold text-indigo-400">
                                        ~{Math.ceil(f.avg_completion_days || 7)} gün
                                    </div>
                                    <div className="text-[9px] text-gray-600 uppercase tracking-tighter">İstasyon: {f.current_station}</div>
                                </div>
                            </div>
                        ))}
                        {forecast.length === 0 && <div className="text-center py-10 text-gray-500 text-sm">Tahmin edilecek aktif emir yok</div>}
                    </CardBody>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Karlılık Analizi Table */}
                <Card className="bg-gray-900/40 backdrop-blur-md border-gray-800">
                    <CardHeader
                        title="Ürün Bazlı Karlılık Analizi"
                        subtitle="Üretim maliyeti ve satış fiyatı karşılaştırması"
                        icon={TrendingUp}
                    />
                    <CardBody className="p-0 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-800 text-[11px] text-gray-500 uppercase">
                                    <th className="px-6 py-4">Ürün</th>
                                    <th className="px-6 py-4 text-right">Ort. Maliyet</th>
                                    <th className="px-6 py-4 text-right">Ort. Satış</th>
                                    <th className="px-6 py-4 text-right">Kar / Birim</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {profitability.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-white">{item.name}</span>
                                                <span className="text-[10px] text-gray-500">{item.sku}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs text-gray-400 font-mono">
                                            {formatCurrency(item.avg_production_cost)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs text-blue-400 font-mono">
                                            {formatCurrency(item.avg_sales_price)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-xs font-bold font-mono px-2 py-1 rounded ${item.avg_profit > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                {formatCurrency(item.avg_profit)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardBody>
                </Card>

                {/* New card for Operatör Verimlilik Sıralaması */}
                <Card className="bg-gray-900/40 backdrop-blur-md border-gray-800">
                    <CardHeader
                        title="Saha Ekibi Performansı"
                        subtitle="İstasyon bazlı işlem hacmi ve hız"
                        icon={Users} // Changed icon to Users
                    />
                    <CardBody className="p-6">
                        <div className="space-y-5">
                            {operators.map((op, idx) => (
                                <div key={idx} className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">
                                        {op.operator_name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-bold text-gray-200">{op.operator_name}</span>
                                            <span className="text-xs text-gray-500 font-mono">{op.task_count} görev</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] text-gray-500">
                                            <span>{op.position || 'Operatör'}</span>
                                            <span>Ort: <span className="text-emerald-400">{formatNumber(op.avg_duration_minutes)} dk</span></span> {/* Used formatNumber */}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {operators.length === 0 && <p className="text-center text-gray-500 py-10">Performans verisi henüz yok</p>}
                        </div>
                    </CardBody>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Fire ve Zayiat Analizi */}
                <Card className="bg-gray-900/40 backdrop-blur-md border-gray-800 border-amber-500/10">
                    <CardHeader
                        title="Zayiat ve Fire Analizi"
                        subtitle="En çok fire veren malzemeler ve oranları"
                        icon={PieChart}
                    />
                    <CardBody className="p-0">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-800 text-[11px] text-gray-500 uppercase">
                                    <th className="px-6 py-4">Malzeme</th>
                                    <th className="px-6 py-4 text-right">Top. Fire</th>
                                    <th className="px-6 py-4 text-right">Ort. Sapma %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {scrap.map((s, idx) => (
                                    <tr key={idx} className="hover:bg-amber-500/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{s.material_name}</td>
                                        <td className="px-6 py-4 text-right text-xs text-amber-400 font-mono">
                                            {formatNumber(s.total_fire)} {s.unit}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-xs font-bold text-rose-400">
                                                %{formatNumber(s.avg_variance_pct)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {scrap.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-gray-500">Fire kaydı bulunamadı</td></tr>}
                            </tbody>
                        </table>
                    </CardBody>
                </Card>

                {/* İstasyon Verimliliği */}
                <Card className="bg-gray-900/40 backdrop-blur-md border-gray-800">
                    <CardHeader
                        title="İstasyon Verimlilik Analizi"
                        subtitle="İstasyon başına ortalama işlem süreleri"
                        icon={Clock}
                    />
                    <CardBody className="p-6">
                        <div className="space-y-6">
                            {efficiency.map((station, idx) => {
                                const statWidth = Math.min((station.avg_duration_minutes / 120) * 100, 100)
                                return (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <span className="text-sm font-medium text-white">{station.station_name}</span>
                                                <span className="text-xs text-gray-500 ml-2">({station.total_orders_processed} emir)</span>
                                            </div>
                                            <span className="text-sm font-mono text-gray-300">{Math.round(station.avg_duration_minutes)} dk</span>
                                        </div>
                                        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-indigo-500 h-full transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                                style={{ width: `${statWidth}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )
                            })}
                            {efficiency.length === 0 && <p className="text-center text-gray-500 py-10">Veri bulunmuyor</p>}
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Analiz Katmanı: Sevkiyat, Gereksinim ve Gecikmeler */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

                <Card className="bg-gray-900/40 backdrop-blur-md border-gray-800 border-emerald-500/10">
                    <CardHeader
                        title="Sevkiyat Hazır"
                        subtitle="Sevkiyat istasyonundaki ürünler"
                        icon={Truck}
                        actions={
                            selectedOrders.length > 0 && (
                                <Button
                                    onClick={createPackingList}
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-lg shadow-emerald-900/20 animate-in fade-in zoom-in duration-300"
                                    disabled={loading}
                                >
                                    <CheckSquare className="w-3.5 h-3.5 mr-2" />
                                    Çeki Listesi ({selectedOrders.length})
                                </Button>
                            )
                        }
                    />
                    <CardBody className="p-0 overflow-x-auto h-[350px]">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-800 text-[10px] text-gray-500 uppercase">
                                    <th className="px-4 py-3 w-10">Selt</th>
                                    <th className="px-4 py-3">Müşteri / Emir</th>
                                    <th className="px-4 py-3 text-right">Miktar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {shipment.map((sh, idx) => {
                                    const isSelected = selectedOrders.includes(sh.id)
                                    return (
                                        <tr
                                            key={idx}
                                            className={`hover:bg-emerald-500/5 transition-colors cursor-pointer ${isSelected ? 'bg-emerald-500/10' : ''}`}
                                            onClick={() => toggleOrderSelection(sh.id)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-400' : 'bg-gray-800 border-gray-700'}`}>
                                                    {isSelected && <Plus className="w-3 h-3 text-white" />}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-white">{sh.customer_name || 'Genel Stok'}</span>
                                                    <span className="text-[10px] text-gray-500">{sh.order_number} - {sh.product_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs text-emerald-400 font-mono">
                                                {sh.quantity} ADT
                                            </td>
                                        </tr>
                                    )
                                })}
                                {shipment.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="text-center py-12 text-gray-600 text-xs">Sevkiyatta bekleyen ürün yok</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardBody>
                </Card>

                {/* Hammadde Gereksinim (MRP) Analizi */}
                <Card className="bg-gray-900/40 backdrop-blur-md border-gray-800 border-indigo-500/10">
                    <CardHeader
                        title="Kritik İhtiyaçlar"
                        subtitle="Eksik hammadde ve malzemeler"
                        icon={PackageSearch}
                    />
                    <CardBody className="p-0 overflow-x-auto h-[350px]">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-800 text-[10px] text-gray-500 uppercase">
                                    <th className="px-4 py-3">Malzeme</th>
                                    <th className="px-4 py-3 text-right">Eksik</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {requirements.map((req, idx) => (
                                    <tr key={idx} className="hover:bg-indigo-500/5 transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-300">
                                            {req.material_name}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded">
                                                -{formatNumber(req.shortage)} {req.unit}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {requirements.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="text-center py-12 text-emerald-500/30 text-xs">Stoklar yeterli</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardBody>
                </Card>

                {/* Gecikme Analizi (Haftalık) */}
                <Card className="bg-gray-900/40 backdrop-blur-md border-gray-800 border-rose-500/10">
                    <CardHeader
                        title="Gecikme Takibi"
                        subtitle="Termin sapması gösteren emirler"
                        icon={AlertCircle}
                    />
                    <CardBody className="p-0 h-[350px] overflow-y-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-800 text-[10px] text-gray-500 uppercase">
                                    <th className="px-4 py-3">Emir</th>
                                    <th className="px-4 py-3 text-right">Sapma</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {delays.map((delay, idx) => (
                                    <tr key={idx} className="hover:bg-rose-500/5 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-white">{delay.order_number}</span>
                                                <span className="text-[9px] text-gray-600">{new Date(delay.due_date).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-[10px] font-bold text-rose-400">
                                                +{Math.ceil(delay.delay_days)} GÜN
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {delays.length === 0 && (
                                    <tr>
                                        <td colSpan={2} className="text-center py-12 text-gray-600 text-xs">Gecikme bulunmuyor</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardBody>
                </Card>
            </div>

            {/* Son Çeki Listeleri ve İrsaliye İşlemleri */}
            <div className="mt-8">
                <Card className="bg-gray-900/40 backdrop-blur-md border-gray-800">
                    <CardHeader
                        title="Son Çeki Listeleri & İrsaliye İşlemleri"
                        subtitle="Hazırlanan sevkiyatların takibi ve irsaliye basımı"
                        icon={Truck}
                    />
                    <CardBody className="p-0 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-800 text-[11px] text-gray-500 uppercase">
                                    <th className="px-6 py-4">Sevkiyat No</th>
                                    <th className="px-6 py-4">Müşteri</th>
                                    <th className="px-6 py-4">Tarih</th>
                                    <th className="px-6 py-4 text-center">Kalem</th>
                                    <th className="px-6 py-4">Durum</th>
                                    <th className="px-6 py-4 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {recentShipments.map((s, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 text-sm font-bold text-emerald-400">{s.shipment_number}</td>
                                        <td className="px-6 py-4 text-sm text-gray-300">{s.customer_name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(s.shipment_date).toLocaleDateString('tr-TR')}</td>
                                        <td className="px-6 py-4 text-center text-sm text-gray-400 font-mono">{s.item_count}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant="soft" color={s.waybill_id ? 'success' : 'warning'} className="text-[10px] uppercase">
                                                {s.waybill_id ? 'İrsaliye Kesildi' : 'İrsaliye Bekliyor'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {s.waybill_id ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                                    onClick={() => router.push(`/waybills/${s.waybill_id}`)}
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                                                    İrsaliyeyi Gör
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="solid"
                                                    size="sm"
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20"
                                                    onClick={() => createWaybill(s.id)}
                                                    disabled={loading}
                                                >
                                                    <FilePlus className="w-3.5 h-3.5 mr-2" />
                                                    İrsaliye Oluştur
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {recentShipments.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-20 text-gray-500 italic">Henüz çeki listesi oluşturulmamış</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardBody>
                </Card>
            </div>
        </AppDashboardLayout>
    )
}
