'use client'

import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Sparkles, AlertTriangle, TrendingUp, Cpu } from 'lucide-react'
import { motion } from 'framer-motion'
import { useMemo } from 'react'

export function AIPredictionsWidget() {
    // Simüle edilmiş bir AI analitik verisi
    const insights = useMemo(() => [
        {
            id: 1,
            type: 'warning',
            icon: AlertTriangle,
            title: 'Stok Tüketim Hızı Uyarısı',
            message: 'Son 7 günlük üretim hızına göre Sünger (28 DNS) stoku 3 gün içinde kritik seviyeye düşecek.',
            color: 'text-amber-400',
            bgColor: 'bg-amber-400/10'
        },
        {
            id: 2,
            type: 'success',
            icon: TrendingUp,
            title: 'Üretim Verimliliği Artışı',
            message: 'Döşeme istasyonundaki ortalama işlem süresi geçen haftaya göre %12 iyileşme gösterdi.',
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-400/10'
        },
        {
            id: 3,
            type: 'info',
            icon: Cpu,
            title: 'Akıllı Termin Önerisi',
            message: 'Mevcut sipariş yoğunluğuna göre yeni alınacak koltuk siparişleri için ideal teslimat süresi: 18 Gün.',
            color: 'text-blue-400',
            bgColor: 'bg-blue-400/10'
        }
    ], [])

    return (
        <Card className="h-full border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20 backdrop-blur-xl hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)] transition-all">
            <CardHeader className="border-b border-slate-800/80 pb-3 h-14">
                <div className="flex flex-1 items-center space-x-2 w-full mt-[-8px]">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 font-bold text-lg">
                        AI Akıllı Öngörüler
                    </span>
                </div>
            </CardHeader>
            <CardBody className="p-4 space-y-4">
                {insights.map((insight, idx) => (
                    <motion.button
                        key={insight.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.15, duration: 0.4 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full text-left flex items-start space-x-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                        onClick={() => {
                            if (insight.type === 'warning') {
                                window.location.href = '/inventory'
                            } else if (insight.type === 'success') {
                                window.location.href = '/reports'
                            } else {
                                window.location.href = '/production'
                            }
                        }}
                    >
                        <div className={`p-2 rounded-lg ${insight.bgColor} shrink-0`}>
                            <insight.icon className={`w-5 h-5 ${insight.color}`} />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-slate-200">{insight.title}</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                {insight.message}
                            </p>
                        </div>
                    </motion.button>
                ))}

                <div className="pt-2 text-center">
                    <p className="text-[10px] text-slate-500 flex items-center justify-center space-x-1">
                        <Cpu className="w-3 h-3" />
                        <span>Super ERP Liva Software tarafından yapılmıştır</span>
                    </p>
                </div>
            </CardBody>
        </Card>
    )
}
