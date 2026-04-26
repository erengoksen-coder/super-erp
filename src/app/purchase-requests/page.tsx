'use client'

import { useState, useEffect } from 'react'
import { 
  ShoppingCart, 
  Package, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  X, 
  Save, 
  Download,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Filter,
  MoreHorizontal,
  History,
  LayoutGrid,
  Activity,
  Box,
  Monitor,
  ChevronRight,
  TrendingUp,
  FileText,
  Truck,
  DollarSign,
  Trash2
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate, formatDateTime } from '@/lib/utils/dateFormat'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/cn'

interface PurchaseRequest {
  id: string
  request_number: string
  material_id: string
  material_name: string
  material_code: string
  material_unit: string
  requested_quantity: number
  received_quantity?: number
  unit_price: number
  total_amount: number
  status: 'draft' | 'ordered' | 'completed' | 'cancelled'
  supplier_name: string | null
  material_supplier_name?: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export default function PurchaseRequestsPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null)
  const [editQuantity, setEditQuantity] = useState<number>(0)
  const [editUnitPrice, setEditUnitPrice] = useState<number>(0)
  const [editSupplierName, setEditSupplierName] = useState<string>('')
  const [exporting, setExporting] = useState(false)
  const [confirmDeleteRequest, setConfirmDeleteRequest] = useState<string | null>(null)

  useEffect(() => {
    loadRequests()
  }, [filterStatus])

  async function loadRequests() {
    setLoading(true)
    try {
      const url = filterStatus === 'all' 
        ? '/api/purchase-requests'
        : `/api/purchase-requests?status=${filterStatus}`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Satın alma talepleri yüklenemedi')
      const data = await response.json()
      // "completed" olanları filtrele (sadece aktif olanları göster)
      const activeData = data.filter((r: PurchaseRequest) => r.status !== 'completed')
      setRequests(activeData)
    } catch (error) {
      console.error('Satın alma talepleri yüklenirken hata:', error)
      toast.error('Satın alma talepleri yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function handleDoubleClick(request: PurchaseRequest) {
    setEditingRequest(request)
    setEditQuantity(request.requested_quantity)
    setEditUnitPrice(request.unit_price)
    
    // Önce mevcut tedarikçi bilgisini kullan, yoksa malzemeden otomatik çek
    const supplierName = request.supplier_name || (request as any).material_supplier_name || ''
    setEditSupplierName(supplierName)
  }

  function cancelEdit() {
    setEditingRequest(null)
    setEditQuantity(0)
    setEditUnitPrice(0)
    setEditSupplierName('')
  }

  async function saveEdit() {
    if (!editingRequest) return

    if (editQuantity <= 0) {
      toast.warning('Miktar pozitif bir değer olmalıdır')
      return
    }

    try {
      const response = await fetch(`/api/purchase-requests/${editingRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_quantity: editQuantity,
          unit_price: editUnitPrice,
          supplier_name: editSupplierName,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Talebi güncellenemedi')
      }

      toast.success('Talep başarıyla güncellendi!')
      cancelEdit()
      loadRequests()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  async function updateStatus(requestId: string, newStatus: 'ordered' | 'completed' | 'cancelled') {
    try {
      const response = await fetch(`/api/purchase-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Durum güncellenemedi')
      }

      toast.success('Durum başarıyla güncellendi!')
      loadRequests()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  async function deleteRequest(requestId: string) {
    setConfirmDeleteRequest(requestId)
  }

  async function executeDeleteRequest(requestId: string) {
    setConfirmDeleteRequest(null)
    try {
      const response = await fetch(`/api/purchase-requests/${requestId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Talebi silinemedi')
      }
      toast.success('Satın alma talebi silindi!')
      loadRequests()
    } catch (error: any) {
      toast.error('Hata: ' + error.message)
    }
  }

  async function exportToPDF() {
    if (typeof window === 'undefined') return
    
    // Sadece "ordered" (Sipariş Edildi) durumundaki talepleri al
    const orderedRequests = requests.filter(r => r.status === 'ordered')
    
    if (orderedRequests.length === 0) {
      toast.warning('Sipariş edilmiş talep bulunmuyor!')
      return
    }

    setExporting(true)
    try {
      const jsPDFModule = await import('jspdf')
      const jsPDF = jsPDFModule.default || jsPDFModule
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let yPos = 20
      const margin = 15
      const lineHeight = 7

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      const title = 'SIPARIS EDILMIS SATIN ALMA TALEPLERI'
      doc.text(title, pageWidth / 2, yPos, { align: 'center' })
      yPos += 10

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const dateStr = formatDate(new Date())
      doc.text(`Tarih: ${dateStr}`, margin, yPos)
      yPos += 8

      const totalAmount = orderedRequests.reduce((sum, r) => sum + r.total_amount, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(`Toplam Talep: ${orderedRequests.length} adet`, margin, yPos)
      yPos += 5
      doc.text(`Toplam Tutar: ${totalAmount.toFixed(2)} TL`, margin, yPos)
      yPos += 8

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const headers = ['Talep No', 'Malzeme', 'Tedarikçi', 'Kod', 'Miktar', 'Birim', 'Birim Fiyat', 'Toplam']
      const colWidths = [28, 35, 30, 15, 15, 10, 20, 20]
      let xPos = margin

      headers.forEach((header, index) => {
        if (index === 3 || index === 4 || index === 6 || index === 7) {
          doc.text(header, xPos + colWidths[index] - 2, yPos, { align: 'right' })
        } else {
          doc.text(header, xPos, yPos)
        }
        xPos += colWidths[index]
      })
      yPos += 5

      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 3

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      
      orderedRequests.forEach((request, index) => {
        if (yPos > pageHeight - 30) {
          doc.addPage()
          yPos = 20
          xPos = margin
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          headers.forEach((header, idx) => {
            if (idx === 3 || idx === 4 || idx === 6 || idx === 7) {
              doc.text(header, xPos + colWidths[idx] - 2, yPos, { align: 'right' })
            } else {
              doc.text(header, xPos, yPos)
            }
            xPos += colWidths[idx]
          })
          yPos += 5
          doc.line(margin, yPos, pageWidth - margin, yPos)
          yPos += 3
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
        }

        xPos = margin
        doc.text(request.request_number, xPos, yPos)
        xPos += colWidths[0]

        const materialNameRaw = request.material_name.length > 15 
          ? request.material_name.substring(0, 12) + '...' 
          : request.material_name
        const materialName = materialNameRaw.replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ş/g, 's').replace(/Ş/g, 'S').replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ü/g, 'u').replace(/Ü/g, 'U').replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ç/g, 'c').replace(/Ç/g, 'C')
        doc.text(materialName, xPos, yPos)
        xPos += colWidths[1]

        const supplierName = (request.supplier_name || '-').replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ş/g, 's').replace(/Ş/g, 'S').replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ü/g, 'u').replace(/Ü/g, 'U').replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ç/g, 'c').replace(/Ç/g, 'C')
        const supplierNameShort = supplierName.length > 12 ? supplierName.substring(0, 9) + '...' : supplierName
        doc.text(supplierNameShort, xPos, yPos)
        xPos += colWidths[2]

        const code = request.material_code || request.material_id.substring(0, 8)
        doc.text(code, xPos + colWidths[3] - 2, yPos, { align: 'right' })
        xPos += colWidths[3]

        doc.text(request.requested_quantity.toFixed(2), xPos + colWidths[4] - 2, yPos, { align: 'right' })
        xPos += colWidths[4]

        doc.text(request.material_unit, xPos, yPos)
        xPos += colWidths[5]

        doc.text(request.unit_price.toFixed(2) + ' TL', xPos + colWidths[6] - 2, yPos, { align: 'right' })
        xPos += colWidths[6]

        doc.text(request.total_amount.toFixed(2) + ' TL', xPos + colWidths[7] - 2, yPos, { align: 'right' })
        yPos += lineHeight
      })

      yPos += 3
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 5

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('GENEL TOPLAM:', pageWidth - margin - 50, yPos, { align: 'right' })
      doc.text(totalAmount.toFixed(2) + ' TL', pageWidth - margin, yPos, { align: 'right' })

      yPos += 15
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text('Not: Bu belge siparis edilmis satin alma taleplerini icermektedir.', margin, yPos)
      yPos += 5
      doc.text(`Toplam ${orderedRequests.length} adet siparis edilmis talep bulunmaktadir.`, margin, yPos)

      const fileName = `Siparis_Edilmis_Talepler_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      toast.success(`PDF başarıyla oluşturuldu. ${orderedRequests.length} talep aktarıldı.`)
    } catch (error) {
      console.error('PDF export error:', error)
      toast.error('PDF oluşturulurken hata oluştu')
    } finally {
      setExporting(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: any = { draft: 'TASLAK', ordered: 'SİPARİŞ EDİLDİ', completed: 'TAMAMLANDI', cancelled: 'İPTAL EDİLDİ' }
    return labels[status] || status.toUpperCase()
  }

  const getStatusColor = (status: string) => {
    const colors: any = { draft: 'secondary', ordered: 'primary', completed: 'success', cancelled: 'error' }
    return colors[status] || 'secondary'
  }

  return (
    <AppDashboardLayout
      title="Satın Alma Talepleri"
      subtitle="Malzeme ihtiyaçları, tedarikçi planlaması ve sipariş takibi"
      icon={ShoppingCart}
      actions={
         <div className="flex items-center gap-3">
            <Button 
               onClick={exportToPDF} 
               disabled={exporting || requests.filter(r => r.status === 'ordered').length === 0}
               color="success"
               size="sm"
               className="shadow-glow shadow-success/20 rounded-xl"
            >
               <Download className="w-4 h-4 mr-2" />
               {exporting ? 'HAZIRLANIYOR' : 'PDF AKTAR'}
            </Button>
            <Button variant="ghost" size="icon" onClick={loadRequests} className="rounded-xl"><RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /></Button>
         </div>
      }
    >
      <div className="space-y-8 animate-reveal">
         <ConfirmDialog 
            isOpen={!!confirmDeleteRequest} 
            onClose={() => setConfirmDeleteRequest(null)} 
            onConfirm={() => confirmDeleteRequest && executeDeleteRequest(confirmDeleteRequest)} 
            title="Talebi Sil" 
            message="Bu satın alma talebi sistemden kalıcı olarak silinecektir." 
            variant="danger" 
         />

         {/* Filter Toolbar */}
         <Card variant="glass" className="border-white/5">
            <CardBody className="p-4 flex items-center gap-6">
               <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-primary opacity-40" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Durum Filtresi:</span>
               </div>
               <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-10 px-6 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
               >
                  <option value="all">TÜM AKTİF TALEPLER</option>
                  <option value="draft">TASLAKLAR</option>
                  <option value="ordered">SİPARİŞ EDİLENLER</option>
                  <option value="cancelled">İPTAL EDİLENLER</option>
               </select>

               <div className="ml-auto flex items-center gap-6">
                  <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-primary shadow-glow animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-foreground/30">CANLI VERİ AKIŞI AKTİF</span>
                  </div>
               </div>
            </CardBody>
         </Card>

         {loading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-6 opacity-40">
               <div className="w-12 h-12 border-2 border-primary border-t-transparent animate-spin rounded-full shadow-glow shadow-primary/20" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">Satın Alma Verileri Taranıyor</p>
            </div>
         ) : requests.length === 0 ? (
            <div className="py-40 flex flex-col items-center justify-center gap-6 opacity-10">
               <ShoppingCart className="w-24 h-24" />
               <div className="text-center space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-widest">Aktif Talep Bulunmuyor</h3>
                  <p className="text-xs font-medium uppercase italic tracking-tighter">İHTİYAÇ LİSTESİ ŞU ANDA TEMİZ.</p>
               </div>
            </div>
         ) : (
            <Card variant="glass" className="border-white/5 overflow-hidden">
               <CardBody className="p-0">
                  <div className="overflow-x-auto">
                     <table className="w-full">
                        <thead>
                           <tr className="bg-white/5 border-b border-white/5 text-[9px] font-black text-foreground/40 uppercase tracking-widest">
                              <th className="p-6 text-left">Evrak No</th>
                              <th className="p-6 text-left">Malzeme / Tedarikçi</th>
                              <th className="p-6 text-right">Miktar Analizi</th>
                              <th className="p-6 text-right">Birim / Toplam Fiyat</th>
                              <th className="p-6 text-center">Durum</th>
                              <th className="p-6 text-left">Kayıt Tarihi</th>
                              <th className="p-6 text-right">İşlemler</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {requests.map((request) => {
                              const received = request.received_quantity || 0
                              const remaining = Math.max(0, request.requested_quantity - received)
                              const isIncomplete = remaining > 0 && request.status === 'ordered'
                              return (
                                 <tr 
                                    key={request.id} 
                                    className={cn(
                                       "hover:bg-white/[0.02] transition-colors group cursor-pointer",
                                       isIncomplete && "bg-error/[0.03] border-l-2 border-error/40 shadow-inner"
                                    )}
                                    onDoubleClick={(e) => {
                                       if ((e.target as HTMLElement).closest('button')) return
                                       handleDoubleClick(request)
                                    }}
                                 >
                                    <td className="p-6 text-xs font-mono font-black text-foreground/30 group-hover:text-primary transition-colors">
                                       {request.request_number}
                                    </td>
                                    <td className="p-6">
                                       <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                             <Package className="w-5 h-5" />
                                          </div>
                                          <div className="flex flex-col">
                                             <span className="text-sm font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight">{request.material_name}</span>
                                             <span className="text-[10px] font-bold opacity-30 uppercase tracking-tight italic flex items-center gap-1">
                                                <Truck className="w-3.5 h-3.5" /> {request.supplier_name || request.material_supplier_name || 'TEDARİKÇİ BELİRTİLMEDİ'}
                                             </span>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="p-6 text-right">
                                       <div className="flex flex-col items-end gap-1">
                                          <div className="flex items-center gap-2">
                                             <span className="text-[10px] font-black text-foreground/40 uppercase">TALEP:</span>
                                             <span className="text-xs font-black text-white italic">{request.requested_quantity.toFixed(2)} {request.material_unit}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                             <span className="text-[10px] font-black text-foreground/20 uppercase">KALAN:</span>
                                             <span className={cn("text-[11px] font-black italic", isIncomplete ? "text-error" : "text-success")}>{remaining.toFixed(2)} {request.material_unit}</span>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="p-6 text-right">
                                       <div className="flex flex-col items-end gap-1">
                                          <div className="flex items-center gap-2">
                                             <span className="text-[10px] font-black text-foreground/40 uppercase">BİRİM:</span>
                                             <span className="text-xs font-bold text-foreground/60">{request.unit_price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                             <span className="text-[10px] font-black text-success uppercase shadow-glow shadow-success/10">TOPLAM:</span>
                                             <span className="text-sm font-black text-success italic tracking-tighter">{request.total_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="p-6 text-center">
                                       <Badge variant="soft" color={getStatusColor(request.status)} className="text-[8px] font-black px-4 tracking-widest shadow-glow-sm">
                                          {getStatusLabel(request.status)}
                                       </Badge>
                                    </td>
                                    <td className="p-6 text-xs text-foreground/30 font-black uppercase italic tracking-tighter">
                                       {formatDateTime(request.created_at)}
                                    </td>
                                    <td className="p-6 text-right">
                                       <div className="flex items-center justify-end gap-2">
                                          {request.status === 'draft' && (
                                             <Button onClick={() => updateStatus(request.id, 'ordered')} variant="soft" color="primary" size="xs" className="h-9 px-4 rounded-xl font-black text-[9px] uppercase"><CheckCircle className="w-4 h-4 mr-2" /> SİPARİŞ VER</Button>
                                          )}
                                          {request.status === 'ordered' && (
                                             <Button onClick={() => updateStatus(request.id, 'completed')} variant="soft" color="success" size="xs" className="h-9 px-4 rounded-xl font-black text-[9px] uppercase shadow-glow-sm shadow-success/10"><CheckCircle2 className="w-4 h-4 mr-2" /> KAPAT</Button>
                                          )}
                                          {(request.status === 'draft' || request.status === 'ordered') && (
                                             <Button onClick={() => updateStatus(request.id, 'cancelled')} variant="soft" color="error" size="xs" className="h-9 w-9 rounded-xl p-0"><XCircle className="w-4 h-4" /></Button>
                                          )}
                                          <Button onClick={() => deleteRequest(request.id)} variant="ghost" color="secondary" size="xs" className="h-9 w-9 rounded-xl p-0 hover:bg-white/5"><Trash2 className="w-4 h-4 text-foreground/20 group-hover:text-error transition-colors" /></Button>
                                       </div>
                                    </td>
                                 </tr>
                              )
                           })}
                        </tbody>
                     </table>
                  </div>
               </CardBody>
            </Card>
         )}

         {/* Edit Modal - Platinum */}
         {editingRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#09090b]/90 backdrop-blur-xl animate-reveal">
               <Card variant="glass" className="w-full max-w-lg border-white/10 shadow-glow-lg overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><DollarSign className="w-64 h-64 text-primary" /></div>
                  <CardHeader className="p-10 border-b border-white/10 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem] text-primary border border-primary/20"><Save className="w-8 h-8 shadow-glow" /></div>
                        <div>
                           <h3 className="text-xl font-black uppercase tracking-tight italic">Talebi Güncelle</h3>
                           <p className="text-[10px] font-bold text-foreground/40 mt-1 uppercase tracking-widest italic leading-relaxed">MİKTAR VE BİRİM FİYAT ANALİZİ</p>
                        </div>
                     </div>
                     <Button variant="ghost" size="icon" onClick={cancelEdit} className="h-12 w-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-all"><X className="w-6 h-6" /></Button>
                  </CardHeader>
                  <CardBody className="p-10 space-y-8">
                     <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Seçili Malzeme</p>
                        <h4 className="text-lg font-black text-white uppercase italic">{editingRequest.material_name}</h4>
                        {editingRequest.material_code && <p className="text-[10px] font-mono font-bold opacity-30 uppercase mt-1">SİSTEM KODU: {editingRequest.material_code}</p>}
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-2">Miktar ({editingRequest.material_unit})</label>
                           <Input 
                              type="number" 
                              variant="filled" 
                              className="h-14 text-lg font-black italic rounded-2xl" 
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(parseFloat(e.target.value) || 0)}
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-2">Birim Fiyat (₺)</label>
                           <Input 
                              type="number" 
                              variant="filled" 
                              className="h-14 text-lg font-black italic rounded-2xl" 
                              value={editUnitPrice}
                              onChange={(e) => setEditUnitPrice(parseFloat(e.target.value) || 0)}
                           />
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-2">Anlaşmalı Tedarikçi</label>
                        <Input 
                           variant="filled" 
                           className="h-14 text-sm font-black uppercase tracking-tight rounded-2xl" 
                           placeholder="Tedarikçi adı..."
                           value={editSupplierName}
                           onChange={(e) => setEditSupplierName(e.target.value)}
                        />
                     </div>

                     <div className="p-8 bg-success/5 rounded-[2.5rem] border border-success/10 flex items-center justify-between">
                        <div>
                           <p className="text-[10px] font-black text-success uppercase tracking-[0.2em] mb-1">Yeni Tahmini Tutar</p>
                           <p className="text-3xl font-black text-success italic tracking-tighter drop-shadow-sm shadow-success/40">
                              {(editQuantity * editUnitPrice).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                           </p>
                        </div>
                        <div className="p-4 bg-success/10 rounded-2xl text-success shadow-glow shadow-success/20"><TrendingUp className="w-8 h-8" /></div>
                     </div>

                     <div className="flex pt-4 gap-4">
                        <Button variant="ghost" onClick={cancelEdit} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest italic hover:bg-white/5 transition-all">İPTAL ET</Button>
                        <Button onClick={saveEdit} color="primary" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest italic shadow-lg shadow-primary/20 transition-all"><Save className="w-5 h-5 mr-3" /> DEĞİŞİKLİKLERİ KAYDET</Button>
                     </div>
                  </CardBody>
               </Card>
            </div>
         )}
      </div>
    </AppDashboardLayout>
  )
}
