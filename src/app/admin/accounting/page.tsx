'use client'

import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  CreditCard,
  History,
  FileText,
  Search,
  Filter,
  Download,
  Plus
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/lib/notify'
import { fetchApi } from '@/lib/api/client'
import { formatCurrency } from '@/lib/numberFormat'

export default function AccountingPage() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<any>(null)

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await fetchApi('/api/accounting/dashboard')
            setStats(data || {
                balance: 1250000.50,
                income: 450000.00,
                expense: 120000.00,
                pending: 45000.00
            })
        } catch (e) {
            toast.error('Muhasebe verileri yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    return (
        <AppDashboardLayout title="Genel Muhasebe" subtitle="Finansal durum ve yevmiye yönetimi" icon={Wallet}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card variant="glass" className="border-emerald-500/10">
                        <CardBody className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Toplam Bakiye</p>
                                <p className="text-2xl font-black">{formatCurrency(stats?.balance || 0)}</p>
                            </div>
                            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                                <DollarSign className="w-5 h-5" />
                            </div>
                        </CardBody>
                    </Card>
                    <Card variant="glass" className="border-primary/10">
                        <CardBody className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Aylık Gelir</p>
                                <p className="text-2xl font-black text-primary">{formatCurrency(stats?.income || 0)}</p>
                            </div>
                            <div className="p-3 bg-primary/10 text-primary rounded-xl">
                                <ArrowUpRight className="w-5 h-5" />
                            </div>
                        </CardBody>
                    </Card>
                    <Card variant="glass" className="border-error/10">
                        <CardBody className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Aylık Gider</p>
                                <p className="text-2xl font-black text-error">{formatCurrency(stats?.expense || 0)}</p>
                            </div>
                            <div className="p-3 bg-error/10 text-error rounded-xl">
                                <ArrowDownLeft className="w-5 h-5" />
                            </div>
                        </CardBody>
                    </Card>
                    <Card variant="glass" className="border-warning/10">
                        <CardBody className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Bekleyen Ödemeler</p>
                                <p className="text-2xl font-black text-warning">{formatCurrency(stats?.pending || 0)}</p>
                            </div>
                            <div className="p-3 bg-warning/10 text-warning rounded-xl">
                                <History className="w-5 h-5" />
                            </div>
                        </CardBody>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card variant="glass">
                        <CardHeader className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground/40">Son Yevmiye Hareketleri</h3>
                            <Button variant="ghost" size="xs">TÜMÜNÜ GÖR</Button>
                        </CardHeader>
                        <CardBody className="p-0">
                           <div className="py-20 text-center opacity-20 font-black tracking-widest text-xs uppercase italic">Henüz hareket bulunamadı</div>
                        </CardBody>
                    </Card>

                    <Card variant="glass">
                        <CardHeader className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground/40">Hızlı İşlemler</h3>
                        </CardHeader>
                        <CardBody className="p-6 grid grid-cols-2 gap-4">
                            <Button variant="soft" color="primary" className="h-24 flex-col gap-2">
                                <Plus className="w-5 h-5" />
                                <span className="text-[10px] font-black tracking-widest">YENİ FİŞ</span>
                            </Button>
                            <Button variant="soft" color="success" className="h-24 flex-col gap-2">
                                <Download className="w-5 h-5" />
                                <span className="text-[10px] font-black tracking-widest">DIŞA AKTAR</span>
                            </Button>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </AppDashboardLayout>
    )
}