'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Printer, 
  ArrowLeft, 
  Truck, 
  Calendar, 
  User, 
  Package, 
  CheckCircle, 
  Edit, 
  Save, 
  X, 
  AlertCircle, 
  RotateCcw, 
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  FileText,
  Clock,
  XCircle,
  Activity,
  History,
  TrendingUp,
  CreditCard,
  ChevronRight
} from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from '@/lib/notify'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate, formatDateTime } from '@/lib/utils/dateFormat'
import { cn } from '@/lib/cn'

interface Shipment {
  id: string
  shipment_number: string
  customer_name: string
  customer_code: string
  customer_address: string
  customer_phone: string
  customer_email: string
  shipment_date: string
  created_at?: string
  status: string
  total_quantity: number
  total_amount?: number
  discount_rate?: number | null
  discount_amount?: number | null
  tax_rate?: number
  tax_amount?: number
  final_amount?: number
  notes: string
  end_customer_name?: string | null
  dealer_name?: string | null
  approval_status?: string | null
  approved_by?: string | null
  approved_at?: string | null
  approval_requested_at?: string | null
  approved_by_name?: string | null
  approved_by_username?: string | null
  customer_risk_limit?: number | null
  customer_balance?: number | null
  items: Array<{
    id: string
    product_name: string
    product_sku: string
    quantity: number
    serial_numbers?: string[]
    notes?: string
  }>
}

export default function ShipmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [cancelReason, setCancelReason] = useState<string>('')
  const [confirmReturn, setConfirmReturn] = useState(false)
  const [confirmApprove, setConfirmApprove] = useState(false)
  
  const userRole = (user?.role || '').toString().toLowerCase()
  const hasApprovalPermission = 
    userRole === 'admin' || 
    userRole === 'manager' || 
    userRole === 'muhasebe' ||
    userRole.includes('yonetici')

  useEffect(() => {
    const id = params?.id as string
    if (id) loadShipment(id)
  }, [params?.id])

  async function loadShipment(id: string) {
    setLoading(true)
    try {
      const response = await fetch(`/api/shipments/${id}`)
      const data = await response.json()
      const payload = data.data || data
      setShipment(payload)
    } catch (error) { toast.error('Hata oluştu') }
    finally { setLoading(false) }
  }

  const executeReturnShipment = async () => {
    setConfirmReturn(false)
    try {
      const response = await fetch(`/api/shipments/${params.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('İşlem başarısız')
      toast.success('Sevkiyat geri alındı.')
      router.push('/shipments')
    } catch (error) { toast.error('Hata oluştu') }
  }

  const executeApprove = async () => {
    setConfirmApprove(false)
    setApproving(true)
    try {
      const res = await fetch(`/api/shipments/${shipment?.id}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error('Onaylanamadı')
      toast.success('Sevkiyat onaylandı!')
      loadShipment(params.id as string)
    } catch (error) { toast.error('Hata oluştu') }
    finally { setApproving(false) }
  }

  const saveStatus = async () => {
    if (!shipment || !selectedStatus) return
    if (selectedStatus === 'cancelled' && !cancelReason.trim()) {
      toast.warning('İptal nedeni zorunludur!')
      return
    }
    try {
      const response = await fetch(`/api/shipments/${shipment.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedStatus,
          cancel_reason: selectedStatus === 'cancelled' ? cancelReason.trim() : null,
        }),
      })
      if (!response.ok) throw new Error('Güncellenemedi')
      toast.success('Durum güncellendi')
      setEditingStatus(false)
      loadShipment(params.id as string)
    } catch (error) { toast.error('Hata oluştu') }
  }

  const timeline = useMemo(() => {
    if (!shipment) return []
    return [
      { label: 'Oluşturuldu', date: shipment.created_at, status: 'completed', icon: FileText },
      { label: 'Planlandı', date: shipment.shipment_date, status: shipment.status !== 'pending' ? 'completed' : 'pending', icon: Calendar },
      { label: 'Yola Çıktı', date: null, status: shipment.status === 'in_transit' || shipment.status === 'delivered' || shipment.status === 'shipped' ? 'completed' : 'pending', icon: Truck },
      { label: 'Teslim Edildi', date: null, status: shipment.status === 'delivered' || shipment.status === 'shipped' ? 'completed' : 'pending', icon: CheckCircle },
    ]
  }, [shipment])

  if (loading) {
    return (
      <AppDashboardLayout title="Sevkiyat Detayı" icon={Truck}>
         <div className="flex items-center justify-center p-20 animate-pulse">
            <div className="text-center opacity-40 font-black uppercase tracking-widest">Sevkiyat Bilgileri Yükleniyor...</div>
         </div>
      </AppDashboardLayout>
    )
  }

  if (!shipment) {
    return (
      <AppDashboardLayout title="Hata" icon={AlertCircle}>
         <div className="text-center p-20 opacity-40 font-black uppercase tracking-widest">Sevkiyat Bulunamadı</div>
      </AppDashboardLayout>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': case 'shipped': return 'success'
      case 'in_transit': return 'primary'
      case 'cancelled': return 'error'
      default: return 'warning'
    }
  }

  return (
    <AppDashboardLayout
      title={`Sevkiyat Detayı: ${shipment.shipment_number}`}
      subtitle={`${shipment.customer_name} • ${formatDate(shipment.shipment_date)}`}
      icon={Truck}
      className="print:bg-white print:p-0"
      actions={
        <div className="flex items-center gap-2 print:hidden">
           <Button variant="ghost" size="sm" onClick={() => router.push('/shipments')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri Dön
           </Button>
           {shipment.approval_status === 'pending' && hasApprovalPermission && (
              <Button color="success" size="sm" onClick={() => setConfirmApprove(true)} disabled={approving}>
                 <ShieldCheck className="w-4 h-4 mr-2" />
                 {approving ? 'Onaylanıyor...' : 'Hemen Onayla'}
              </Button>
           )}
           <Button variant="glass" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Yazdır
           </Button>
           <Button variant="soft" color="error" size="sm" onClick={() => setConfirmReturn(true)}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Geri Al
           </Button>
        </div>
      }
    >
      <ConfirmDialog isOpen={confirmReturn} onClose={() => setConfirmReturn(false)} onConfirm={executeReturnShipment} title="Sevkiyatı Geri Al" message="Ürünler stoka geri eklenecek. Emin misiniz?" variant="danger" />
      <ConfirmDialog isOpen={confirmApprove} onClose={() => setConfirmApprove(false)} onConfirm={executeApprove} title="Risk Onayı" message="Bakiye aşımı nedeniyle manuel onay gerekiyor. Onaylıyor musunuz?" variant="warning" />

      <div className="space-y-6 animate-reveal print:hidden">
         {/* Status Timeline Card */}
         <Card variant="glass" className="bg-primary/5 border-primary/20">
            <CardBody className="p-8">
               <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 hidden md:block" />
                  {timeline.map((step, i) => (
                    <div key={i} className="relative z-10 flex flex-col items-center flex-1">
                       <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500", step.status === 'completed' ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110" : "bg-white/5 text-foreground/20 border border-white/5" )}>
                          <step.icon className="w-6 h-6" />
                       </div>
                       <p className={cn("mt-4 text-[10px] font-black uppercase tracking-widest text-center", step.status === 'completed' ? "text-foreground" : "text-foreground/20")}>{step.label}</p>
                       {step.date && <p className="text-[10px] text-foreground/40 mt-1 font-mono">{formatDate(step.date)}</p>}
                    </div>
                  ))}
               </div>
            </CardBody>
         </Card>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
               {/* Shipment Items */}
               <Card variant="glass">
                  <CardHeader className="p-6 border-b border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-primary" />
                        <h3 className="font-black uppercase tracking-widest text-sm">Sevk Edilen Ürünler</h3>
                     </div>
                     <Badge color={getStatusColor(shipment.status)}>{shipment.status.toUpperCase()}</Badge>
                  </CardHeader>
                  <CardBody className="p-0">
                     <div className="divide-y divide-white/5">
                        {shipment.items.map((item, idx) => (
                          <div key={idx} className="p-6 flex items-start gap-4 hover:bg-white/[0.02] transition-colors">
                             <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0">
                                <span className="font-black text-primary">{item.quantity}</span>
                             </div>
                             <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                   <h4 className="font-black text-lg">{item.product_name}</h4>
                                   <p className="font-mono text-xs text-foreground/40">{item.product_sku}</p>
                                </div>
                                {item.serial_numbers && item.serial_numbers.length > 0 && (
                                   <div className="flex flex-wrap gap-2 mt-3">
                                      {item.serial_numbers.map((sn, snIdx) => (
                                         <Badge key={snIdx} variant="glass" className="font-mono text-[10px] text-foreground/60">{sn}</Badge>
                                      ))}
                                   </div>
                                )}
                             </div>
                          </div>
                        ))}
                     </div>
                     <div className="p-6 bg-white/[0.03] border-t border-white/5 flex justify-between items-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 italic">Toplam {shipment.total_quantity} Adet Ürün Paketlendi</p>
                        {shipment.final_amount && <p className="text-xl font-black text-primary">₺{shipment.final_amount.toLocaleString()}</p>}
                     </div>
                  </CardBody>
               </Card>

               {/* Notes Section */}
               {shipment.notes && (
                  <Card variant="glass">
                     <CardHeader className="p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                           <FileText className="w-5 h-5 text-secondary" />
                           <h3 className="font-black uppercase tracking-widest text-sm">Sevkiyat Notları</h3>
                        </div>
                     </CardHeader>
                     <CardBody className="p-6">
                        <p className="text-sm font-medium leading-relaxed opacity-70 p-4 bg-white/5 rounded-2xl border border-white/5">{shipment.notes}</p>
                     </CardBody>
                  </Card>
               )}
            </div>

            <div className="space-y-6">
               {/* Customer Info Card */}
               <Card variant="glass" className="bg-secondary/5 border-secondary/20">
                  <CardHeader className="p-6 pb-2">
                     <h3 className="font-black uppercase tracking-widest text-[10px] text-foreground/40">Alıcı Bilgileri</h3>
                  </CardHeader>
                  <CardBody className="p-6 space-y-6">
                     <div>
                        <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest leading-none mb-1">Cari / Müşteri</p>
                        <p className="text-xl font-black">{shipment.customer_name}</p>
                        <p className="text-xs font-mono text-primary mt-1">{shipment.customer_code}</p>
                     </div>
                     {(shipment.customer_phone || shipment.customer_email) && (
                        <div className="space-y-2 pt-2 border-t border-white/5">
                           {shipment.customer_phone && <p className="text-xs flex items-center gap-2 opacity-60"><Phone className="w-3 h-3" /> {shipment.customer_phone}</p>}
                           {shipment.customer_email && <p className="text-xs flex items-center gap-2 opacity-60"><Mail className="w-3 h-3" /> {shipment.customer_email}</p>}
                        </div>
                     )}
                     <div className="flex items-start gap-2 pt-2 border-t border-white/5">
                        <MapPin className="w-3 h-3 mt-1 shrink-0 opacity-40 text-primary" />
                        <p className="text-xs font-medium leading-normal opacity-50">{shipment.customer_address || 'Adres bilgisi girilmemiş'}</p>
                     </div>
                  </CardBody>
               </Card>

               {/* Risk & Approval Context */}
               {shipment.approval_status === 'pending' && (
                  <Card variant="glass" className="bg-red-500/5 border-red-500/20">
                     <CardBody className="p-6 space-y-4">
                        <div className="flex items-center gap-3 text-red-500">
                           <TrendingUp className="w-5 h-5" />
                           <h4 className="text-xs font-black uppercase tracking-widest">Risk Uyarısı</h4>
                        </div>
                        <p className="text-[11px] font-medium leading-relaxed opacity-60">Müşterinin bakiye limiti bu sevkiyatla aşıldığı için onay bekliyor.</p>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                           <div>
                              <p className="text-[9px] font-black opacity-20 uppercase">Limit</p>
                              <p className="font-black text-sm">₺{shipment.customer_risk_limit?.toLocaleString()}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black opacity-20 uppercase">Bakiye</p>
                              <p className="font-black text-sm text-red-500">₺{shipment.customer_balance?.toLocaleString()}</p>
                           </div>
                        </div>
                     </CardBody>
                  </Card>
               )}

               {/* Approval Info */}
               {shipment.approved_by_name && (
                  <Card variant="glass" className="bg-emerald-500/5 border-emerald-500/20">
                     <CardBody className="p-6 space-y-3">
                        <div className="flex items-center gap-3 text-emerald-500">
                           <ShieldCheck className="w-5 h-5" />
                           <h4 className="text-xs font-black uppercase tracking-widest">Sistem Onayı</h4>
                        </div>
                        <p className="text-xs font-bold leading-tight uppercase opacity-60">Bu sevkiyat <span className="text-emerald-500">{shipment.approved_by_name}</span> tarafından onaylanmıştır.</p>
                        <p className="text-[10px] opacity-40 font-mono italic">{formatDateTime(shipment.approved_at)}</p>
                     </CardBody>
                  </Card>
               )}

               {/* Mini History */}
               <div className="px-2">
                  <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest flex items-center gap-2 mb-4">
                     <History className="w-3 h-3" />
                     Süreç Geçmişi
                  </p>
                  <div className="space-y-4 border-l-2 border-white/5 ml-1.5 pl-4">
                     <div className="relative">
                        <div className="absolute top-1.5 -left-[21px] w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-glow" />
                        <p className="text-[11px] font-bold text-foreground/60 leading-tight">Sevkiyat Fişi Oluşturuldu</p>
                        <p className="text-[10px] text-foreground/20 font-medium mt-1 uppercase tracking-tighter">{formatDateTime(shipment.created_at)}</p>
                     </div>
                     {shipment.status !== 'pending' && (
                        <div className="relative">
                           <div className="absolute top-1.5 -left-[21px] w-2.5 h-2.5 rounded-full bg-primary/40" />
                           <p className="text-[11px] font-bold text-foreground/60 leading-tight">Durum Güncellendi: {shipment.status.toUpperCase()}</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>

         {/* Original Shipment Slip for Print - Hidden visually */}
         <div className="hidden print:block print:bg-white print:text-black">
            <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
               <h1 className="text-2xl font-bold uppercase">SEVKİYAT FİŞİ</h1>
               <p className="text-xs mt-1">Liva Sofa Pro - ERP Platinum</p>
            </div>
            <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
               <div>
                  <h2 className="font-bold border-b mb-2">SEVKİYAT BİLGİLERİ</h2>
                  <p><strong>Fiş No:</strong> {shipment.shipment_number}</p>
                  <p><strong>Tarih:</strong> {formatDate(shipment.shipment_date)}</p>
               </div>
               <div>
                  <h2 className="font-bold border-b mb-2">MÜŞTERİ BİLGİLERİ</h2>
                  <p><strong>Cari:</strong> {shipment.customer_name}</p>
                  <p><strong>Adres:</strong> {shipment.customer_address}</p>
               </div>
            </div>
            <table className="w-full text-sm border-collapse border border-gray-300 mb-8">
               <thead>
                  <tr className="bg-gray-100 italic">
                     <th className="border border-gray-300 p-2 text-left">Ürün</th>
                     <th className="border border-gray-300 p-2 text-center">Adet</th>
                  </tr>
               </thead>
               <tbody>
                  {shipment.items.map((item, i) => (
                    <tr key={i}>
                       <td className="border border-gray-300 p-2 font-bold">{item.product_name}</td>
                       <td className="border border-gray-300 p-2 text-center font-black">{item.quantity}</td>
                    </tr>
                  ))}
               </tbody>
            </table>
            <div className="text-center text-[10px] text-gray-400 mt-20">Bu belge Platinum ERP tarafından otomatik üretilmiştir.</div>
         </div>
      </div>

      <style jsx global>{`
        @media print {
          nav, header, aside, .print-hidden, .btn-group { display: none !important; }
          .main-shell { padding: 0 !important; background: white !important; }
          .AppDashboardLayout { padding: 0 !important; }
          body { background: white !important; color: black !important; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
        }
      `}</style>
    </AppDashboardLayout>
  )
}
