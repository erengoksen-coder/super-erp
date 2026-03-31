'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  PackageSearch, 
  ArrowLeft, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  History, 
  Activity, 
  TrendingUp, 
  Layers, 
  Clock, 
  FileText, 
  User, 
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Box,
  Info
} from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { getReferenceTypeLabel } from '@/lib/utils/referenceTypeLabels'
import { formatDate, formatDateTime } from '@/lib/utils/dateFormat'
import { cn } from '@/lib/cn'

type MaterialDetail = {
  id: string
  name: string
  code?: string | null
  stock_amount: number
  min_stock_level: number
  unit: string
  category?: string | null
  unit_price?: number | null
}

type StockMovement = {
  id: string
  movement_type: string
  quantity: number
  reference_type: string | null
  reference_id: string | null
  invoice_number: string | null
  shipment_number: string | null
  notes: string | null
  created_at: string
  user_name: string | null
  date: string
  time: string
}

export default function InventoryMaterialDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [material, setMaterial] = useState<MaterialDetail | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'in' | 'out'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const id = params?.id as string
    if (!id) return
    loadData(id)
  }, [params?.id])

  async function loadData(id: string) {
    setLoading(true)
    try {
      const data = await fetchApi<MaterialDetail>(`/api/inventory/materials/${id}`)
      setMaterial(data || null)
      const movementsData = await fetchApi<{ movements: StockMovement[] }>(`/api/materials/${id}/movements`)
      if (movementsData?.movements) setMovements(movementsData.movements)
    } catch (err: any) {
      setError(err.message || 'Hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const filteredMovements = useMemo(() => {
    if (activeTab === 'all') return movements
    return movements.filter(m => m.movement_type === activeTab)
  }, [movements, activeTab])

  if (loading) {
    return (
      <AppDashboardLayout title="Malzeme Detayı" icon={PackageSearch}>
         <div className="flex flex-col items-center justify-center p-20 animate-pulse">
            <div className="text-center opacity-40 font-black uppercase tracking-widest text-lg">Malzeme Verileri Yükleniyor...</div>
         </div>
      </AppDashboardLayout>
    )
  }

  if (error || !material) {
    return (
      <AppDashboardLayout title="Hata" icon={AlertTriangle}>
         <div className="text-center p-20 opacity-40 font-black uppercase tracking-widest">Malzeme Bulunamadı</div>
      </AppDashboardLayout>
    )
  }

  const isCritical = material.stock_amount <= material.min_stock_level

  return (
    <AppDashboardLayout
      title={material.name}
      subtitle={material.code ? `STOK KODU: ${material.code}` : 'Malzeme Detay ve Hareket Geçmişi'}
      icon={PackageSearch}
      actions={
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
           <ArrowLeft className="w-4 h-4 mr-2" />
           Geri Dön
        </Button>
      }
    >
      <div className="space-y-6 animate-reveal">
         {/* Stats Row */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Mevcut Stok</p>
                     <p className={cn("text-3xl font-black", isCritical ? "text-error shadow-glow-sm shadow-error/20" : "text-success")}>
                        {material.stock_amount} <span className="text-sm font-medium opacity-30">{material.unit}</span>
                     </p>
                  </div>
                  <div className={cn("p-4 rounded-2xl bg-white/5", isCritical ? "text-error" : "text-success")}>
                     <Layers className="w-6 h-6" />
                  </div>
               </CardBody>
            </Card>

            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Minimum Seviye</p>
                     <p className="text-3xl font-black text-foreground">
                        {material.min_stock_level} <span className="text-sm font-medium opacity-30">{material.unit}</span>
                     </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 text-primary">
                     <AlertTriangle className="w-6 h-6" />
                  </div>
               </CardBody>
            </Card>

            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Birim Fiyat</p>
                     <p className="text-3xl font-black text-foreground">
                        ₺{material.unit_price?.toLocaleString() || '0'}
                     </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 text-secondary">
                     <TrendingUp className="w-6 h-6" />
                  </div>
               </CardBody>
            </Card>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Movement History Table */}
            <div className="lg:col-span-2 space-y-6">
               <Card variant="glass">
                  <CardHeader className="p-6 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                     <div className="flex items-center gap-3">
                        <History className="w-5 h-5 text-primary" />
                        <h3 className="font-black uppercase tracking-widest text-sm">Stok Hareket Geçmişi</h3>
                     </div>
                     <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                        <Button variant={activeTab === 'all' ? 'solid' : 'ghost'} size="sm" onClick={() => setActiveTab('all')} className="rounded-lg px-4">Tümü</Button>
                        <Button variant={activeTab === 'in' ? 'solid' : 'ghost'} color="success" size="sm" onClick={() => setActiveTab('in')} className="rounded-lg px-4">Girişler</Button>
                        <Button variant={activeTab === 'out' ? 'solid' : 'ghost'} color="error" size="sm" onClick={() => setActiveTab('out')} className="rounded-lg px-4">Çıkışlar</Button>
                     </div>
                  </CardHeader>
                  <CardBody className="p-0">
                     <div className="overflow-x-auto">
                        <table className="w-full">
                           <thead>
                              <tr className="bg-white/5 border-b border-white/5">
                                 <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Tarih / Saat</th>
                                 <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">İşlem Tipi</th>
                                 <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Miktar</th>
                                 <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Referans / Not</th>
                                 <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-right">Kullanıcı</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                              {filteredMovements.length === 0 ? (
                                 <tr>
                                    <td colSpan={5} className="py-20 text-center opacity-20 font-black uppercase tracking-widest text-xs">Hareket kaydı bulunamadı</td>
                                 </tr>
                              ) : (
                                 filteredMovements.map((m) => (
                                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                                       <td className="p-4">
                                          <div className="flex flex-col">
                                             <span className="text-sm font-bold text-foreground/80">{m.date}</span>
                                             <span className="text-[10px] font-mono opacity-40 tracking-tighter">{m.time}</span>
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <Badge variant="soft" color={m.movement_type === 'in' ? 'success' : 'error'} className="font-black text-[9px] px-3">
                                             {m.movement_type === 'in' ? 'STOK GİRİŞİ' : 'STOK ÇIKIŞI'}
                                          </Badge>
                                       </td>
                                       <td className="p-4">
                                          <span className={cn("text-lg font-black", m.movement_type === 'in' ? "text-success" : "text-error")}>
                                             {m.movement_type === 'in' ? '+' : '-'}{m.quantity}
                                             <span className="text-[10px] font-medium opacity-30 ml-1">{material.unit}</span>
                                          </span>
                                       </td>
                                       <td className="p-4">
                                          <div className="flex flex-col max-w-[200px]">
                                             <span className="text-[10px] font-black text-primary uppercase tracking-widest truncate">
                                                {m.reference_type ? getReferenceTypeLabel(m.reference_type) : 'MANUEL İŞLEM'}
                                                {m.reference_id && <span className="text-foreground/30 font-mono ml-2">#{m.reference_id}</span>}
                                             </span>
                                             {m.notes && <span className="text-xs font-medium opacity-50 truncate mt-0.5 italic">"{m.notes}"</span>}
                                          </div>
                                       </td>
                                       <td className="p-4 text-right">
                                          <div className="flex items-center justify-end gap-2">
                                             <div className="p-1.5 bg-white/5 rounded-lg">
                                                <User className="w-3 h-3 opacity-40" />
                                             </div>
                                             <span className="text-xs font-bold text-foreground/40">{m.user_name || 'Sistem'}</span>
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

            {/* Sidebar Details */}
            <div className="space-y-6">
               <Card variant="glass" className="bg-primary/5 border-primary/20">
                  <CardHeader className="p-6 pb-2">
                     <h3 className="font-black uppercase tracking-widest text-[10px] text-foreground/40">Malzeme Kimliği</h3>
                  </CardHeader>
                  <CardBody className="p-6 space-y-6">
                     <div>
                        <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest leading-none mb-1">Kategori</p>
                        <p className="text-xl font-black uppercase text-primary tracking-tighter">{material.category || 'Belirtilmemiş'}</p>
                     </div>
                     <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest leading-none mb-4 italic">Sistem Durumu</p>
                        <div className="space-y-3">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Stok Sağlığı</span>
                              {isCritical ? <Badge color="error" variant="soft" className="animate-pulse">KRİTİK</Badge> : <Badge color="success" variant="soft">NORMAL</Badge>}
                           </div>
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Kayıt Türü</span>
                              <Badge variant="glass" className="text-[9px]">HAMMADDE</Badge>
                           </div>
                        </div>
                     </div>
                  </CardBody>
               </Card>

               <Card variant="glass" className="bg-secondary/5 border-secondary/20">
                  <CardBody className="p-6">
                     <div className="flex items-center gap-3 text-secondary mb-4">
                        <Activity className="w-5 h-5" />
                        <h4 className="text-xs font-black uppercase tracking-widest">Aktivite Özeti</h4>
                     </div>
                     <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                           <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Son 30 Gün Hareket</p>
                           <p className="text-2xl font-black">{movements.length} İşlem</p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold opacity-30 italic leading-relaxed">
                           <Info className="w-3 h-3 shrink-0" />
                           Bu malzemenin stok seviyeleri her üretim emri sonrası otomatik olarak düşürülmektedir.
                        </div>
                     </div>
                  </CardBody>
               </Card>

               <div className="px-2">
                  <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest flex items-center gap-2 mb-4">
                     <History className="w-3 h-3" />
                     Grup Hareketleri
                  </p>
                  <div className="space-y-4 border-l-2 border-white/5 ml-1.5 pl-4">
                     {movements.slice(0, 3).map((m, i) => (
                        <div key={i} className="relative">
                           <div className={cn("absolute top-1.5 -left-[21px] w-2.5 h-2.5 rounded-full shadow-glow-sm", m.movement_type === 'in' ? "bg-success" : "bg-error")} />
                           <p className="text-[11px] font-bold text-foreground/60 leading-tight truncate">{m.movement_type === 'in' ? 'Stok Girişi' : 'Stok Çıkışı'}: {m.quantity} {material.unit}</p>
                           <p className="text-[9px] text-foreground/20 font-medium mt-1 uppercase tracking-tighter">{m.date} • {m.time}</p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
    </AppDashboardLayout>
  )
}
