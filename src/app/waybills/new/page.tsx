'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Package,
  Truck,
  Building2,
  Calendar,
  CheckCircle2
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/lib/notify'
import { fetchApi } from '@/lib/api/client'

export default function NewWaybillPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [customerName, setCustomerName] = useState('')
    const [waybillDate, setWaybillDate] = useState(new Date().toISOString().split('T')[0])
    const [vehiclePlate, setVehiclePlate] = useState('')
    const [items, setItems] = useState<{ id: string; name: string; quantity: number }[]>([])

    const handleSubmit = async () => {
        if (!customerName || items.length === 0) {
            toast.error('Müşteri ve en az bir ürün gereklidir.')
            return
        }

        setLoading(true)
        try {
            await fetchApi('/api/waybills', {
                method: 'POST',
                body: JSON.stringify({
                    customer_name: customerName,
                    date: waybillDate,
                    plate: vehiclePlate,
                    items
                })
            })
            toast.success('İrsaliye başarıyla oluşturuldu')
            router.push('/inventory/shipments')
        } catch (e) {
            toast.error('Kayıt sırasında bir hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AppDashboardLayout title="Yeni Sevk İrsaliyesi" subtitle="Mal sevkiyatı için resmi irsaliye kaydı oluştur" icon={Truck}>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Geri Dön
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card variant="glass" className="lg:col-span-1 border-white/5 shadow-2xl">
                        <CardHeader className="p-6 border-b border-white/5">
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground/40">Sevkiyat Bilgileri</h3>
                        </CardHeader>
                        <CardBody className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Müşteri / Alıcı</label>
                                <Input variant="filled" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Alıcı bilgisini girin..." />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Sevk Tarihi</label>
                                <Input type="date" variant="filled" value={waybillDate} onChange={e => setWaybillDate(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Araç Plakası</label>
                                <Input variant="filled" value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="34 ABC 123" />
                            </div>
                        </CardBody>
                    </Card>

                    <Card variant="glass" className="lg:col-span-2 border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="p-6 border-b border-white/5 flex items-center justify-between bg-primary/5">
                            <h3 className="text-xs font-black uppercase tracking-widest text-primary/60">Sevk Edilecek Malzeme Listesi</h3>
                            <Button variant="soft" color="primary" size="xs" onClick={() => setItems([...items, { id: Math.random().toString(), name: '', quantity: 1 }])}>
                                <Plus className="w-3 h-3 mr-1" />
                                SATIR EKLE
                            </Button>
                        </CardHeader>
                        <CardBody className="p-0 overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-white/5 text-[9px] font-black text-foreground/30 uppercase tracking-widest border-b border-white/5">
                                        <th className="p-4 text-left">Mal ve Hizmet Açıklaması</th>
                                        <th className="p-4 text-center w-32">Miktar</th>
                                        <th className="p-4 text-right w-16">#</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {items.length === 0 ? (
                                        <tr><td colSpan={3} className="py-24 text-center opacity-20 font-black tracking-widest text-xs uppercase italic">Sevk edilecek ürün bulunamadı</td></tr>
                                    ) : (
                                        items.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="p-4">
                                                    <Input variant="filled" placeholder="Ürün adı, SKU veya barkod..." value={item.name} onChange={e => {
                                                        const next = [...items];
                                                        next[index].name = e.target.value;
                                                        setItems(next);
                                                    }} className="h-9 text-xs font-black uppercase" />
                                                </td>
                                                <td className="p-4">
                                                    <Input type="number" variant="filled" value={item.quantity} onChange={e => {
                                                        const next = [...items];
                                                        next[index].quantity = parseInt(e.target.value);
                                                        setItems(next);
                                                    }} className="h-9 text-center text-xs font-black" />
                                                </td>
                                                <td className="p-4 text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== index))} className="text-error hover:bg-error/10 h-9 w-9">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </CardBody>
                    </Card>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                    <Button variant="ghost" onClick={() => router.back()} disabled={loading} className="font-black uppercase tracking-widest px-8">İPTAL</Button>
                    <Button color="primary" onClick={handleSubmit} loading={loading} className="px-12 h-14 font-black uppercase tracking-wider shadow-glow hover:scale-[1.03] active:scale-95 transition-all">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        İRSALİYEYİ OLUŞTUR VE ONAYLA
                    </Button>
                </div>
            </div>
        </AppDashboardLayout>
    )
}
