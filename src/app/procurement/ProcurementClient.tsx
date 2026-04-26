'use client'

import { useMemo, useEffect, useState } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  X, 
  Save, 
  ShoppingCart, 
  Package, 
  Truck, 
  DollarSign, 
  FileText, 
  Activity, 
  ChevronRight,
  TrendingUp,
  Box,
  Monitor,
  Calendar,
  Zap,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/cn'
import { toast } from '@/lib/notify'

type PurchaseRequest = {
  id: string
  request_number: string
  material_id: string
  material_name?: string | null
  requested_quantity: number
  unit_price?: number | null
  total_amount?: number | null
  status: string
  created_at: string
  supplier_name?: string | null
  notes?: string | null
}

export default function ProcurementClient() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null)
  const [form, setForm] = useState({
    material_id: '',
    requested_quantity: '',
    unit_price: '',
    supplier_name: '',
    notes: '',
  })
  const [editForm, setEditForm] = useState({
    status: 'draft',
    requested_quantity: '',
    unit_price: '',
    supplier_name: '',
  })
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function loadRequests() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApi<PurchaseRequest[]>('/api/procurement/purchase-requests')
      setRequests(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Satın alma talepleri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRequests() }, [])

  useEffect(() => {
    if (!selectedRequest) return
    setEditForm({
      status: selectedRequest.status || 'draft',
      requested_quantity: String(selectedRequest.requested_quantity ?? ''),
      unit_price: selectedRequest.unit_price ? String(selectedRequest.unit_price) : '',
      supplier_name: selectedRequest.supplier_name || '',
    })
  }, [selectedRequest])

  async function createRequest() {
    try {
      setError(null)
      await fetchApi('/api/procurement/purchase-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: form.material_id,
          requested_quantity: Number(form.requested_quantity),
          unit_price: form.unit_price ? Number(form.unit_price) : undefined,
          supplier_name: form.supplier_name || undefined,
          notes: form.notes || undefined,
        }),
      })
      setForm({ material_id: '', requested_quantity: '', unit_price: '', supplier_name: '', notes: '' })
      toast.success('Yeni talep oluşturuldu')
      await loadRequests()
    } catch (err: any) {
      toast.error(err.message || 'Hata oluştu')
    }
  }

  async function updateRequest() {
    if (!selectedRequest) return
    try {
      setError(null)
      await fetchApi(`/api/procurement/purchase-requests/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editForm.status,
          requested_quantity: Number(editForm.requested_quantity),
          unit_price: editForm.unit_price ? Number(editForm.unit_price) : undefined,
          supplier_name: editForm.supplier_name || undefined,
        }),
      })
      toast.success('Talep güncellendi')
      setSelectedRequest(null)
      await loadRequests()
    } catch (err: any) {
      toast.error(err.message || 'Güncellenemedi')
    }
  }

  async function executeDeleteRequest(id: string) {
    try {
      setConfirmDeleteId(null)
      await fetchApi(`/api/procurement/purchase-requests/${id}`, { method: 'DELETE' })
      if (selectedRequest?.id === id) setSelectedRequest(null)
      toast.success('Talep silindi')
      await loadRequests()
    } catch (err: any) {
      toast.error('Silinemedi')
    }
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter
      const search = searchTerm.toLowerCase()
      return matchesStatus && (!search || request.request_number.toLowerCase().includes(search) || request.material_name?.toLowerCase().includes(search) || request.material_id.toLowerCase().includes(search))
    })
  }, [requests, statusFilter, searchTerm])

  const getStatusBadge = (status: string) => {
    const map: any = { draft: 'secondary', ordered: 'primary', completed: 'success', cancelled: 'error' }
    const labels: any = { draft: 'TASLAK', ordered: 'SİPARİŞ VERİLDİ', completed: 'TAMAMLANDI', cancelled: 'İPTAL' }
    return <Badge variant="soft" color={map[status] || 'secondary'} className="text-[8px] font-black px-3 tracking-widest">{labels[status] || status.toUpperCase()}</Badge>
  }

  return (
    <div className="space-y-8 animate-reveal">
      <ConfirmDialog isOpen={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} onConfirm={() => confirmDeleteId && executeDeleteRequest(confirmDeleteId)} title="Talebi Sil" message="Bu satın alma talebi sistemden kalıcı olarak silinecektir." variant="danger" />

      {/* New Request Form Card */}
      <Card variant="glass" className="border-white/5 overflow-hidden group">
         <CardHeader className="p-8 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 group-hover:scale-110 transition-transform shadow-glow shadow-primary/20">
                  <Plus className="w-6 h-6 shadow-glow" />
               </div>
               <div>
                  <h2 className="text-lg font-black uppercase tracking-tight">Yeni Satın Alma Talebi</h2>
                  <p className="text-[9px] font-bold text-foreground/30 uppercase mt-1 tracking-widest italic">İHTİYAÇ LİSTESİNE EKLEME YAPIN</p>
               </div>
            </div>
         </CardHeader>
         <CardBody className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-2">Malzeme ID</label>
                  <Input 
                     variant="filled" 
                     placeholder="Kod giriniz..." 
                     className="h-12 text-xs font-bold uppercase transition-all focus:border-primary/40" 
                     value={form.material_id}
                     onChange={(e) => setForm((prev) => ({ ...prev, material_id: e.target.value }))}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-2">Miktar</label>
                  <Input 
                     type="number"
                     variant="filled" 
                     placeholder="0.00" 
                     className="h-12 text-xs font-bold italic" 
                     value={form.requested_quantity}
                     onChange={(e) => setForm((prev) => ({ ...prev, requested_quantity: e.target.value }))}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-2">Birim Fiyat (₺)</label>
                  <Input 
                     type="number"
                     variant="filled" 
                     placeholder="Opsiyonel" 
                     className="h-12 text-xs font-bold italic" 
                     value={form.unit_price}
                     onChange={(e) => setForm((prev) => ({ ...prev, unit_price: e.target.value }))}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-2">Önerilen Tedarikçi</label>
                  <Input 
                     variant="filled" 
                     placeholder="Tedarikçi adı..." 
                     className="h-12 text-xs font-bold uppercase" 
                     value={form.supplier_name}
                     onChange={(e) => setForm((prev) => ({ ...prev, supplier_name: e.target.value }))}
                  />
               </div>
            </div>
            <div className="flex gap-4 items-end">
               <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-2">Ek Notlar</label>
                  <Input 
                     variant="filled" 
                     placeholder="Talep detayları, aciliyet vb..." 
                     className="h-12 text-xs font-bold" 
                     value={form.notes}
                     onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
               </div>
               <Button 
                  onClick={createRequest} 
                  disabled={loading || !form.material_id.trim() || !form.requested_quantity.trim()}
                  color="primary"
                  className="h-12 px-10 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 italic"
               >
                  <Save className="w-4 h-4 mr-3" /> TALEP OLUŞTUR
               </Button>
            </div>
         </CardBody>
      </Card>

      {/* Requests List Card */}
      <Card variant="glass" className="border-white/5 overflow-hidden">
         <CardHeader className="p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-secondary/10 rounded-2xl text-secondary border border-secondary/20">
                  <ShoppingCart className="w-6 h-6 shadow-glow" />
               </div>
               <h3 className="text-sm font-black uppercase tracking-widest text-foreground/80">Aktif Talepler</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:min-w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/20" />
                  <Input 
                     variant="filled" 
                     placeholder="Talep no veya malzeme ara..." 
                     className="pl-11 h-11 text-xs font-bold uppercase" 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
               <select
                  className="h-11 px-6 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
               >
                  <option value="all">TÜM DURUMLAR</option>
                  <option value="draft">TASLAKLAR</option>
                  <option value="ordered">SİPARİŞLER</option>
                  <option value="completed">TAMAMLANANLAR</option>
                  <option value="cancelled">İPTALLER</option>
               </select>
               <Button variant="ghost" size="icon" onClick={loadRequests} className="h-11 w-11 rounded-2xl"><RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /></Button>
            </div>
         </CardHeader>
         <CardBody className="p-0">
            <div className="overflow-x-auto">
               <table className="w-full">
                  <thead>
                     <tr className="bg-white/5 border-b border-white/5 text-[9px] font-black text-foreground/40 uppercase tracking-widest">
                        <th className="p-6 text-left">Evrak No</th>
                        <th className="p-6 text-left">Malzeme / Tanım</th>
                        <th className="p-6 text-right">Miktar</th>
                        <th className="p-6 text-center">Durum</th>
                        <th className="p-6 text-right">İşlem</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                     {loading ? (
                        <tr><td colSpan={5} className="py-24 text-center animate-pulse opacity-40 font-black uppercase tracking-widest text-xs italic">Satın Alma Veritabanı Taranıyor...</td></tr>
                     ) : filteredRequests.length === 0 ? (
                        <tr><td colSpan={5} className="py-24 text-center opacity-20 font-black uppercase tracking-widest text-xs italic">Kayıt Bulunmuyor</td></tr>
                     ) : (
                        filteredRequests.map((request) => (
                           <tr 
                              key={request.id} 
                              className={cn(
                                 "hover:bg-white/[0.02] transition-colors group cursor-pointer",
                                 selectedRequest?.id === request.id && "bg-primary/[0.03] border-l-2 border-primary/40 shadow-inner"
                              )}
                              onClick={() => setSelectedRequest(request)}
                           >
                              <td className="p-6 text-xs font-mono font-black text-foreground/30 group-hover:text-primary transition-colors italic">
                                 {request.request_number}
                              </td>
                              <td className="p-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                       <Box className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="text-sm font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight italic">{request.material_name || request.material_id}</span>
                                       <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest italic">{request.material_id}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="p-6 text-right">
                                 <span className="text-xs font-black text-white italic tracking-tighter shadow-glow-sm">{request.requested_quantity} Brm</span>
                              </td>
                              <td className="p-6 text-center">
                                 {getStatusBadge(request.status)}
                              </td>
                              <td className="p-6 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <Button 
                                       variant="ghost" 
                                       size="icon" 
                                       onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); }} 
                                       className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10 transition-all"
                                       title="Detay"
                                    >
                                       <ChevronRight className="w-5 h-5 shadow-glow" />
                                    </Button>
                                    <Button 
                                       variant="ghost" 
                                       size="icon" 
                                       onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(request.id); }} 
                                       className="h-9 w-9 rounded-xl text-red-500 hover:bg-error/10 transition-all"
                                       title="Sil"
                                    >
                                       <Trash2 className="w-4 h-4 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
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

      {/* Request Detail Modal Overlay stylized as a card section */}
      {selectedRequest && (
         <Card variant="glass" className="border-primary/20 bg-primary/[0.02] animate-reveal">
            <CardHeader className="p-8 border-b border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="p-4 bg-primary/20 rounded-2xl text-primary border border-primary/20 shadow-glow shadow-primary/40">
                     <Monitor className="w-8 h-8 shadow-glow" />
                  </div>
                  <div>
                     <h3 className="text-2xl font-black uppercase tracking-tight italic">Talep Düzenleme: {selectedRequest.request_number}</h3>
                     <p className="text-[10px] font-bold text-foreground/40 mt-1 uppercase tracking-widest italic">İDARİ GÜNCELLEME VE TEDARİK YÖNETİMİ</p>
                  </div>
               </div>
               <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(null)} className="h-12 w-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-all"><X className="w-6 h-6" /></Button>
            </CardHeader>
            <CardBody className="p-10 space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Malzeme Tanımı</p>
                     <p className="text-xl font-black text-white uppercase italic">{selectedRequest.material_name || selectedRequest.material_id}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">İşlem Durumu</p>
                     <div className="pt-2">{getStatusBadge(selectedRequest.status)}</div>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Mevcut Toplam</p>
                     <p className="text-xl font-black text-success italic tracking-tighter drop-shadow-sm shadow-success/40">₺{(selectedRequest.total_amount ?? 0).toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Kayıt Zamanı</p>
                     <p className="text-sm font-black text-foreground/40 uppercase italic">{new Date(selectedRequest.created_at).toLocaleString('tr-TR')}</p>
                  </div>
               </div>

               <div className="pt-10 border-t border-white/5">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-2">Durum Güncelle</label>
                        <select
                           className="h-12 w-full px-6 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                           value={editForm.status}
                           onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                        >
                           <option value="draft">TASLAK</option>
                           <option value="ordered">SİPARİŞ VERİLDİ</option>
                           <option value="completed">TAMAMLANDI</option>
                           <option value="cancelled">İPTAL EDİLDİ</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-2">Miktar Revizesi</label>
                        <Input 
                           variant="filled" 
                           className="h-12 text-xs font-black italic rounded-2xl" 
                           placeholder="0.00" 
                           value={editForm.requested_quantity}
                           onChange={(e) => setEditForm((prev) => ({ ...prev, requested_quantity: e.target.value }))}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-2">Yeni Birim Fiyat (₺)</label>
                        <Input 
                           variant="filled" 
                           className="h-12 text-xs font-black italic rounded-2xl" 
                           placeholder="0.00" 
                           value={editForm.unit_price}
                           onChange={(e) => setEditForm((prev) => ({ ...prev, unit_price: e.target.value }))}
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-foreground/30 uppercase tracking-widest px-2">Onaylı Tedarikçi</label>
                        <Input 
                           variant="filled" 
                           className="h-12 text-xs font-black uppercase rounded-2xl" 
                           placeholder="Şirket adı..." 
                           value={editForm.supplier_name}
                           onChange={(e) => setEditForm((prev) => ({ ...prev, supplier_name: e.target.value }))}
                        />
                     </div>
                  </div>

                  <div className="mt-10 flex justify-end gap-4">
                     <Button variant="ghost" onClick={() => setSelectedRequest(null)} className="px-8 h-12 rounded-2xl font-black uppercase tracking-widest italic hover:bg-white/5">VAZGEÇ</Button>
                     <Button onClick={updateRequest} color="primary" className="px-10 h-12 rounded-2xl font-black uppercase tracking-widest italic shadow-lg shadow-primary/20" disabled={loading}>
                        <CheckCircle className="w-4 h-4 mr-3" /> DEĞİŞİKLİKLERİ UYGULA
                     </Button>
                  </div>
               </div>
            </CardBody>
         </Card>
      )}
    </div>
  )
}
