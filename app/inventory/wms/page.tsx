'use client'

import { useState, useEffect } from 'react'
import { Warehouse, CheckCircle2, ChevronRight, Package, Loader2 } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { fetchApi } from '@/lib/api/client'

type PickItem = {
    id: string
    product_sku: string
    product_name: string
    quantity: number
    location: string
    status: 'pending' | 'picked'
}

export default function WmsPage() {
    const [pickList, setPickList] = useState<PickItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeStep, setActiveStep] = useState(0)

    useEffect(() => {
        async function loadRoute() {
            try {
                const res = await fetchApi<{ success: boolean; data: PickItem[] }>('/api/inventory/wms')
                if (res.success) {
                    setPickList(res.data)
                }
            } catch (err: any) {
                setError(err.message || 'Rota yüklenemedi.')
            } finally {
                setLoading(false)
            }
        }
        loadRoute()
    }, [])

    const handlePick = (index: number) => {
        setPickList(prev => {
            const newList = [...prev]
            newList[index].status = 'picked'
            return newList
        })
        if (activeStep === index) {
            setActiveStep(index + 1)
        }
    }

    const progress = pickList.length > 0 ? (pickList.filter(x => x.status === 'picked').length / pickList.length) * 100 : 0

    return (
        <AppDashboardLayout
            title="İleri Seviye Depo (WMS)"
            subtitle="Akıllı toplama rotası ve depo adresleme sistemi"
            icon={Warehouse}
        >
            <div className="mx-auto max-w-5xl space-y-6">

                {/* Progress Overview */}
                <Card className="bg-gray-900 border border-gray-800">
                    <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">Toplama Emri #TE-2409</h2>
                                <p className="text-gray-400 text-sm mt-1">Sistem tarafından en kısa yürüme rotası (A {'>'} B {'>'} C) hesaplanmıştır.</p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black text-blue-400">{Math.round(progress)}%</div>
                                <div className="text-sm text-gray-400">Tamamlandı</div>
                            </div>
                        </div>
                        <div className="h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                            <div
                                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </CardBody>
                </Card>

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                ) : typeof window !== 'undefined' ? (
                    <div className="grid lg:grid-cols-5 gap-6">

                        {/* Pick List / Routing */}
                        <div className="lg:col-span-3 space-y-4">
                            {pickList.map((item, index) => {
                                const isActive = activeStep === index
                                const isPicked = item.status === 'picked'

                                return (
                                    <div
                                        key={item.id}
                                        className={`relative rounded-2xl border p-5 transition-all duration-300 ${isPicked
                                                ? 'bg-emerald-900/10 border-emerald-500/30'
                                                : isActive
                                                    ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] scale-[1.02] z-10'
                                                    : 'bg-gray-900 border-gray-800 opacity-60'
                                            }`}
                                    >
                                        {!isActive && !isPicked && (
                                            <div className="absolute inset-0 bg-gray-900/40 z-20 rounded-2xl pointer-events-none" />
                                        )}

                                        <div className="flex items-start justify-between gap-4">

                                            {/* Location Badge */}
                                            <div className="flex flex-col items-center">
                                                <div className={`flex items-center justify-center w-12 h-12 rounded-xl font-black text-lg shadow-inner ${isPicked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                        : isActive ? 'bg-blue-500 text-white shadow-blue-500/30'
                                                            : 'bg-gray-800 text-gray-500 border border-gray-700'
                                                    }`}>
                                                    {item.location.split('-')[0]}
                                                </div>
                                                <div className={`mt-2 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'
                                                    }`}>
                                                    Raf {item.location.split('-')[1]}
                                                </div>
                                            </div>

                                            {/* Product Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-mono text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{item.product_sku}</span>
                                                    {isPicked && <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded">Toplandı</span>}
                                                </div>
                                                <h3 className={`font-semibold text-lg truncate ${isPicked ? 'text-gray-400 line-through' : 'text-white'}`}>
                                                    {item.product_name}
                                                </h3>
                                                <div className="mt-2 flex items-center gap-4 text-sm text-gray-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <Package className="w-4 h-4" />
                                                        Hedef: <strong className={isPicked ? 'text-gray-500' : 'text-white'}>{item.quantity} Adet</strong>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs">
                                                        Göz: <strong className={isPicked ? 'text-gray-500' : 'text-white'}>{item.location.split('-')[2]}</strong>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action */}
                                            <div className="flex flex-col items-end justify-center">
                                                {!isPicked && (
                                                    <Button
                                                        size="lg"
                                                        className={`h-14 px-8 rounded-xl font-semibold ${isActive ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}`}
                                                        onClick={() => handlePick(index)}
                                                        disabled={!isActive}
                                                    >
                                                        Onayla
                                                    </Button>
                                                )}
                                                {isPicked && (
                                                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                        <CheckCircle2 className="w-7 h-7" />
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Warehouse Visual Mockup */}
                        <div className="lg:col-span-2">
                            <div className="sticky top-6">
                                <Card className="bg-gray-900 border border-gray-800 overflow-hidden">
                                    <div className="bg-slate-800/50 pt-6 px-6 pb-4 border-b border-gray-800">
                                        <h3 className="text-white font-semibold flex items-center gap-2">
                                            <Warehouse className="w-5 h-5 text-blue-400" />
                                            Kuş Bakışı Rota Haritası
                                        </h3>
                                    </div>
                                    <CardBody className="p-6">
                                        <div className="aspect-square w-full rounded-xl border border-gray-700 bg-gray-950 p-4 relative grid grid-cols-4 grid-rows-4 gap-3">
                                            {/* Simüle Depo Izgarası */}
                                            {Array.from({ length: 16 }).map((_, i) => {
                                                const aisle = String.fromCharCode(65 + Math.floor(i / 4)); // A, B, C, D
                                                const rack = (i % 4) + 1;
                                                const locMatch = `${aisle}-0${rack}`;

                                                // Check if any pending item is here
                                                const isPendingHere = pickList.some(p => p.status === 'pending' && p.location.startsWith(locMatch));
                                                const isPickedHere = pickList.some(p => p.status === 'picked' && p.location.startsWith(locMatch));

                                                return (
                                                    <div
                                                        key={i}
                                                        className={`rounded-md border flex items-center justify-center text-xs font-mono transition-colors ${isPendingHere ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                                                                : isPickedHere ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500/50'
                                                                    : 'bg-gray-900 border-gray-800 text-gray-600'
                                                            }`}
                                                    >
                                                        {locMatch}
                                                    </div>
                                                )
                                            })}

                                            {/* Fake path line */}
                                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ filter: 'drop-shadow(0px 0px 4px rgba(59,130,246,0.5))' }}>
                                                <path d="M 40,40 L 150,40 L 150,150 L 260,150" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6,6" className="text-blue-500/50" />
                                            </svg>
                                        </div>
                                        <p className="mt-4 text-xs text-gray-500 text-center">
                                            Mavi alanlar toplamanız gereken sıradaki lokasyonları gösterir.
                                        </p>
                                    </CardBody>
                                </Card>
                            </div>
                        </div>

                    </div>
                ) : null}
            </div>
        </AppDashboardLayout>
    )
}
