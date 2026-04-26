'use client'

import { useCallback, useEffect, useState } from 'react'
import { Package, AlertCircle, ShoppingCart, Loader2, RefreshCw, Layers } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { fetchApi } from '@/lib/api/client'
import { toast } from 'sonner'

export default function MRPPage() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetchApi<any>('/api/production/mrp?onlyShortages=false')
            setData(res?.list || [])
        } catch { 
            toast.error('MRP verileri yüklenirken hata oluştu')
        } finally { 
            setLoading(false) 
        }
    }, [])

    useEffect(() => { load() }, [load])

    const totalShortages = data.filter(d => d.shortage > 0).length
    const criticalMaterials = data.filter(d => d.shortage > 0 && d.current_stock === 0)

    const handleCreatePurchaseRequest = async (materialId: string) => {
        toast.promise(
            fetchApi('/api/production/mrp/purchase-request', {
                method: 'POST',
                body: JSON.stringify({ materialId })
            }),
            {
                loading: 'Satın alma talebi oluşturuluyor...',
                success: 'Talep başarıyla oluşturuldu',
                error: (err: any) => `Hata: ${err.message}`
            }
        )
    }

    return (
        <AppDashboardLayout
            title="Malzeme İhtiyaç Planlaması (MRP)"
            subtitle="Siparişler ve üretim emirleri için hammadde analizi"
            icon={Layers}
        >
            <div className="space-y-6">
                {/* Özet Kartları */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card variant="elevated">
                        <CardBody className="p-6 flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                                <Package className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Analiz Edilen Malzeme</div>
                                <div className="text-2xl font-bold text-white">{data.length}</div>
                            </div>
                        </CardBody>
                    </Card>
                    <Card variant="elevated">
                        <CardBody className="p-6 flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${totalShortages > 0 ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'}`}>
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Eksiğe Düşen</div>
                                <div className="text-2xl font-bold text-white">{totalShortages}</div>
                            </div>
                        </CardBody>
                    </Card>
                    <Card variant="elevated">
                        <CardBody className="p-6 flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${criticalMaterials.length > 0 ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-500'}`}>
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Kritik (Sıfır Stok)</div>
                                <div className="text-2xl font-bold text-white">{criticalMaterials.length}</div>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Ana Tablo */}
                <Card variant="elevated">
                    <CardHeader 
                        title="Hammadde İhtiyaç Listesi" 
                        subtitle="Aktif siparişleri karşılamak için gereken miktarlar"
                        actions={
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    <span className="ml-2">Yenile</span>
                                </Button>
                            </div>
                        }
                    />
                    <CardBody className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Malzeme</TableHead>
                                    <TableHead className="text-right">Toplam İhtiyaç</TableHead>
                                    <TableHead className="text-right">Mevcut Stok</TableHead>
                                    <TableHead className="text-right">Net Eksik</TableHead>
                                    <TableHead>Etkilenen Siparişler</TableHead>
                                    <TableHead className="text-right">İşlem</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                                            <div className="mt-2 text-gray-500">Hesaplanıyor...</div>
                                        </TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-20 text-gray-500">
                                            Bekleyen sipariş veya malzeme ihtiyacı bulunamadı.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item) => (
                                        <TableRow key={item.material_id} className={item.shortage > 0 ? 'bg-orange-950/5' : ''}>
                                            <TableCell>
                                                <div className="font-medium text-white">{item.material_name}</div>
                                                <div className="text-[10px] text-gray-500">{item.material_code}</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="font-medium">{item.total_needed}</span> {item.unit}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={item.current_stock < item.total_needed ? 'text-orange-400 font-bold' : 'text-green-400'}>
                                                    {item.current_stock}
                                                </span> {item.unit}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.shortage > 0 ? (
                                                    <Badge color="error" variant="soft">
                                                        -{item.shortage} {item.unit}
                                                    </Badge>
                                                ) : (
                                                    <Badge color="success" variant="soft">Yeterli</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                    {item.blocked_orders.slice(0, 3).map((o: any, idx: number) => (
                                                        <span key={idx} className="px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded text-[9px] border border-gray-700">
                                                            #{o.order_number}
                                                        </span>
                                                    ))}
                                                    {item.blocked_orders.length > 3 && (
                                                        <span className="text-[9px] text-gray-500 italic">+{item.blocked_orders.length - 3} daha</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.shortage > 0 && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        color="primary"
                                                        onClick={() => handleCreatePurchaseRequest(item.material_id)}
                                                    >
                                                        <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                                                        Satın Al
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardBody>
                </Card>
            </div>
        </AppDashboardLayout>
    )
}
