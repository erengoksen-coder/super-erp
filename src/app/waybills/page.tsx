'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  MoreHorizontal,
  ChevronRight,
  ArrowRight,
  Printer,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/lib/notify'
import { fetchApi } from '@/lib/api/client'
import { formatDateTime } from '@/lib/utils/dateFormat'

export default function WaybillsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [waybills, setWaybills] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')

    const loadWaybills = async () => {
        setLoading(true)
        try {
            const data = await fetchApi('/api/waybills')
            setWaybills(Array.isArray(data) ? data : [])
        } catch (e) {
            toast.error('İrsaliyeler yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadWaybills()
    }, [])

    const filtered = waybills.filter(w => 
        w.waybill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <AppDashboardLayout 
            title="İrsaliye Yönetimi" 
            subtitle="Gelen ve giden sevk irsaliyelerinin takibi" 
            icon={Truck}
            actions={
                <Button color="primary" onClick={() => router.push('/waybills/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    YENİ İRSALİYE
                </Button>
            }
        >
            <div className="space-y-6">
                <Card variant="glass">
                    <CardHeader className="p-6 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full md:w-96 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20 group-focus-within:text-primary transition-colors" />
                            <Input variant="filled" placeholder="İrsaliye no veya müşteri ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                        </div>
                        <div className="flex items-center gap-2">
                           <Button variant="ghost" size="sm">
                              <Filter className="w-4 h-4 mr-2" />
                              Filtrele
                           </Button>
                        </div>
                    </CardHeader>
                    <CardBody className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-white/5 text-[10px] font-black text-foreground/40 uppercase tracking-widest border-b border-white/5">
                                        <th className="p-4 text-left">İrsaliye No</th>
                                        <th className="p-4 text-left">Müşteri / Alıcı</th>
                                        <th className="p-4 text-left">Tarih</th>
                                        <th className="p-4 text-left">Durum</th>
                                        <th className="p-4 text-right">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr><td colSpan={5} className="py-20 text-center opacity-40 font-black tracking-widest text-xs">Yükleniyor...</td></tr>
                                    ) : filtered.length === 0 ? (
                                        <tr><td colSpan={5} className="py-20 text-center opacity-20 font-black tracking-widest text-xs italic">Sonuç bulunamadı</td></tr>
                                    ) : (
                                        filtered.map((w) => (
                                            <tr key={w.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="p-4">
                                                    <span className="text-sm font-black text-primary group-hover:underline cursor-pointer">{w.waybill_number}</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-sm font-bold opacity-80">{w.customer_name}</span>
                                                </td>
                                                <td className="p-4">
                                                   <div className="flex flex-col">
                                                      <span className="text-xs font-bold">{formatDateTime(w.created_at)}</span>
                                                   </div>
                                                </td>
                                                <td className="p-4">
                                                    <Badge variant="soft" color={w.status === 'draft' ? 'primary' : 'success'} className="px-3 py-1 font-black text-[9px] uppercase">
                                                        {w.status === 'draft' ? 'TASLAK' : 'GÖNDERİLDİ'}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10">
                                                            <Printer className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/40 opacity-0 group-hover:opacity-100 transition-all">
                                                            <ChevronRight className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </AppDashboardLayout>
    )
}