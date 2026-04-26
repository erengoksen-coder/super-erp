'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Truck, Hammer, Settings, CheckCircle } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import Link from 'next/link'

interface TimelineStep {
    id: string
    title: string
    description: string
    date: string | null
    status: 'completed' | 'active' | 'pending'
    icon: string
}

const CANCELLED_BY_DEALER = 'bayi_tarafindan_iptal'

interface OrderDetails {
    order_number: string
    dealer_name?: string
    customer_name?: string
    product_name?: string
    quantity?: number
    order_date?: string
    status: string
    cancel_reason?: string | null
    configuration?: string
    kumas?: string
    kasa?: string
    ayak?: string
    kirlent?: string
    birim?: string
    aciklama?: string
}

export default function BayiOrderTimelinePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [timeline, setTimeline] = useState<TimelineStep[]>([])
    const [orderInfo, setOrderInfo] = useState<OrderDetails | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchApi(`/api/bayi/orders/${id}/timeline`)
            .then((res: any) => {
                if (res?.success) {
                    setTimeline(res.timeline || [])
                    setOrderInfo(res.order_details || { order_number: res.order_number, status: res.status, product_name: res.product_name || '—' })
                } else {
                    toast.error('Sipariş takip bilgisi alınamadı.')
                }
            })
            .catch((err: any) => {
                console.error(err)
                toast.error(err?.message || 'API isteği başarısız.')
            })
            .finally(() => setLoading(false))
    }, [id])

    const getIcon = (iconStr: string) => {
        switch (iconStr) {
            case 'CheckCircle': return <CheckCircle className="w-5 h-5 text-white" />
            case 'Settings': return <Settings className="w-5 h-5 text-white" />
            case 'Hammer': return <Hammer className="w-5 h-5 text-white" />
            case 'Package': return <Package className="w-5 h-5 text-white" />
            case 'Truck': return <Truck className="w-5 h-5 text-white" />
            default: return <CheckCircle className="w-5 h-5 text-white" />
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
                    Sipariş Gidişatı
                </h2>

                <button
                    onClick={() => router.push('/bayi/orders')}
                    className="text-sm px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700/60 shadow-sm"
                >
                    Siparişlerime Dön
                </button>
            </div>

            {orderInfo && (
                <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 shadow-sm">
                    {/* Üst Kısım: SIP No ve Durum */}
                    <div className="flex justify-between items-start gap-4 flex-wrap mb-6 pb-4 border-b border-slate-700/50">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-white tracking-wide">
                                {orderInfo.order_number}
                            </h3>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold tracking-wide shadow-sm ${orderInfo.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            orderInfo.status === 'cancelled' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                orderInfo.status === 'processing' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                    'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                            }`}>
                            {orderInfo.status === 'completed' ? 'Tamamlandı' :
                                orderInfo.status === 'processing' ? 'İşleniyor' :
                                    orderInfo.status === 'cancelled' ? (orderInfo.cancel_reason === CANCELLED_BY_DEALER ? 'Bayi tarafından iptal edilmiştir' : 'İptal edildi') : 'Bekliyor'}
                        </span>
                    </div>
                    {orderInfo.status === 'cancelled' && (
                        <div className="mb-4 pb-3 border-b border-slate-700/50">
                            <p className="text-sm text-slate-400">
                                {orderInfo.cancel_reason === CANCELLED_BY_DEALER
                                    ? 'Bu sipariş bayi portalından iptal edilmiştir.'
                                    : 'Bu sipariş iptal edilmiştir.'}
                            </p>
                        </div>
                    )}

                    {/* Alt Kısım: Detaylar Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                        {/* Kolon 1 */}
                        <div className="space-y-4">
                            <div>
                                <p className="text-slate-500 text-[11px] mb-1 font-semibold uppercase">Nerede devam ediyor</p>
                                <p className="text-slate-300 font-medium">-</p>
                            </div>
                            <div>
                                <p className="text-slate-500 text-[11px] mb-1 font-semibold uppercase">Üretim Emri</p>
                                <p className="text-slate-300 font-medium">-</p>
                            </div>
                            <div>
                                <p className="text-slate-500 text-[11px] mb-1 font-semibold uppercase">SİP TRH</p>
                                <p className="text-slate-300 font-medium">{orderInfo.order_date ? new Date(orderInfo.order_date).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}</p>
                            </div>
                        </div>

                        {/* Kolon 2 */}
                        <div className="space-y-4">
                            <div>
                                <p className="text-slate-500 text-[11px] mb-1 font-semibold uppercase">TAKİP NO</p>
                                <p className="text-slate-300 font-medium">{orderInfo.order_number}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 text-[11px] mb-1 font-semibold uppercase">CARİ ADI</p>
                                <p className="text-slate-300 font-medium">{orderInfo.dealer_name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 text-[11px] mb-1 font-semibold uppercase">ÜRÜN ADI</p>
                                <p className="text-slate-300 font-medium">{orderInfo.product_name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 text-[11px] mb-1 font-semibold uppercase">MÜŞTERİ ADI</p>
                                <p className="text-slate-300 font-medium">{orderInfo.customer_name || '-'}</p>
                            </div>
                        </div>

                        {/* Kolon 3 */}
                        <div className="space-y-4">
                            <div>
                                <p className="text-slate-500 text-[11px] mb-1 font-semibold uppercase">KASA</p>
                                <p className="text-slate-300 font-medium">{orderInfo.kasa || '-'}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 text-[11px] mb-1 font-semibold uppercase">AÇIKLAMA</p>
                                <p className="text-slate-300 font-medium overflow-hidden text-ellipsis whitespace-nowrap" title={orderInfo.aciklama}>{orderInfo.aciklama || '-'}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 text-[11px] mb-1 font-semibold uppercase">SİP MİKTAR</p>
                                <p className="text-slate-300 font-medium">{orderInfo.quantity ? `${orderInfo.quantity} ADET` : '-'}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 text-[11px] mb-1 font-semibold uppercase">AYAK</p>
                                <p className="text-slate-300 font-medium">{orderInfo.ayak || '-'}</p>
                            </div>
                        </div>

                        {/* Kolon 4 */}
                        <div className="space-y-4">
                            <div>
                                <p className="text-slate-500 text-[11px] mb-1 font-semibold uppercase">KUMAŞ KODU</p>
                                <p className="text-slate-300 font-medium">{orderInfo.kumas || '-'}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 text-[11px] mb-1 font-semibold uppercase">KONFİGÜRASYON</p>
                                <p className="text-slate-300 font-medium">{orderInfo.configuration || '-'}</p>
                            </div>
                            <div>
                                <p className="text-slate-500 text-[11px] mb-1 font-semibold uppercase">KIRLENT</p>
                                <p className="text-slate-300 font-medium">{orderInfo.kirlent || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 sm:p-10">
                {loading ? (
                    <div className="flex justify-center py-20 animate-pulse">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                ) : timeline.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        Bu siparişe ait takip verisi bulunamadı.
                    </div>
                ) : (
                    <div className="relative max-w-2xl mx-auto">
                        {/* Dikey çizgi */}
                        <div className="absolute left-[28px] top-6 bottom-6 w-0.5 bg-slate-700"></div>

                        <div className="space-y-8 relative">
                            {timeline.map((step, index) => {
                                const isActive = step.status === 'active'
                                const isCompleted = step.status === 'completed'
                                const isPending = step.status === 'pending'

                                return (
                                    <div key={step.id} className={`relative flex gap-6 ${isPending ? 'opacity-50' : ''}`}>

                                        {/* İkon & Çember */}
                                        <div className="relative z-10 flex-shrink-0 mt-1">
                                            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 border-slate-900 ${isCompleted ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' :
                                                isActive ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)] ring-4 ring-blue-500/20' :
                                                    'bg-slate-700'
                                                }`}>
                                                {getIcon(step.icon)}
                                            </div>
                                        </div>

                                        {/* İçerik */}
                                        <div className="flex-1 pb-4 pt-2">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-2">
                                                <h3 className={`text-lg font-bold ${isCompleted ? 'text-green-400' :
                                                    isActive ? 'text-blue-400' : 'text-slate-300'
                                                    }`}>
                                                    {step.title}
                                                </h3>
                                                {step.date && (
                                                    <span className="text-xs font-medium px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap w-fit">
                                                        {new Date(step.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-slate-400 text-sm leading-relaxed">
                                                {step.description}
                                            </p>

                                            {isActive && (
                                                <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-blue-400 bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-800/50">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                                    Şu an bu aşamada işlem görüyor
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
