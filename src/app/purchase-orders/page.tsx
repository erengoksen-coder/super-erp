'use client'

import { useState, useMemo } from 'react'
import { 
  Plus, Search, ClipboardList, Package, 
  Truck, CheckCircle2, AlertCircle, X,
  ArrowUpRight, ArrowDownRight, MoreVertical,
  Calendar, CreditCard, ShoppingBag, FileText, ChevronLeft, ChevronRight,
  Boxes, Factory
} from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { usePaginatedApi, getAuthHeaders } from '@/lib/api/client'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { formatDate } from '@/lib/utils/dateFormat'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { useApi } from '@/lib/api/client'
import { ReplenishmentAI } from '@/components/purchasing/ReplenishmentAI'
import { cn } from '@/lib/cn'

type PurchaseOrder = {
  id: string
  order_number: string
  order_date: string
  status: 'pending' | 'approved' | 'completed' | 'cancelled'
  total_amount: number
  supplier_name: string
  supplier_code: string
}

export default function PurchaseOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeStatus, setActiveStatus] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [showNewModal, setShowNewModal] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  const debouncedSearch = useDebounce(searchTerm, 300)
  const PAGE_SIZE = 12

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))
    if (activeStatus !== 'all') params.set('status', activeStatus)
    if (debouncedSearch) params.set('search', debouncedSearch)
    return `/api/purchase-orders?${params.toString()}`
  }, [activeStatus, page, debouncedSearch])

  const { data, meta, isLoading, mutate } = usePaginatedApi<PurchaseOrder>(apiUrl)
  const { data: materials = [] } = useApi<any[]>('/api/inventory/materials')
  const [activeTab, setActiveTab] = useState<'orders' | 'ai' | 'suppliers'>('orders')

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      setProcessingId(orderId)
      const res = await fetch(`/api/purchase-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status })
      })
      
      if (!res.ok) throw new Error('Durum güncellenemedi')
      
      toast.success(`Sipariş durumu ${status} olarak güncellendi`)
      mutate()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const statusMap = {
    pending: { label: 'Beklemede', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    approved: { label: 'Onaylandı', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    completed: { label: 'Tamamlandı', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    cancelled: { label: 'İptal', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-lg shadow-primary/10">
              <Boxes className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">TEDARİK ZİNCİRİ 4.0</h1>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-0.5">Procurement & Strategic Sourcing</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="glass" className="border-white/10 text-white/40 hover:bg-white/5 h-11 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest">
            <FileText className="w-4 h-4 mr-2" /> RAPORLAR
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 shadow-xl shadow-primary/25 text-white h-11 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest"
            onClick={() => setShowNewModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> YENİ SATINALMA
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center my-8">
        <div className="inline-flex p-1.5 glass rounded-[2rem] border border-white/5 shadow-2xl">
          {[
            { id: 'orders', label: 'SİPARİŞLER', icon: ShoppingBag },
            { id: 'ai', label: 'AKILLI İKMAL', icon: BrainCircuit },
            { id: 'suppliers', label: 'TEDARİKÇİLER', icon: Factory }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                "flex items-center gap-3 px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                activeTab === t.id ? "bg-white/10 text-white shadow-xl border border-white/10" : "text-white/20 hover:text-white/40"
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'ai' && <ReplenishmentAI materials={materials} />}

      {activeTab === 'orders' && (
        <div className="space-y-6 animate-reveal">
          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-white/[0.03] border-white/10 backdrop-blur-md rounded-3xl group hover:border-primary/30 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">BEKLEYEN SİPARİŞ</p>
                  <h3 className="text-3xl font-black text-white italic">
                    {isLoading ? '...' : (meta.total || 0)}
                  </h3>
                </div>
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all">
                  <AlertCircle className="w-6 h-6 text-primary group-hover:text-white" />
                </div>
              </div>
            </Card>
            
            <Card className="p-6 bg-white/[0.03] border-white/10 backdrop-blur-md rounded-3xl group hover:border-rose-500/30 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">TEDARİKÇİ ÖDEMELERİ</p>
                  <h3 className="text-3xl font-black text-rose-400 italic">
                    85.200 <span className="text-sm font-normal text-white/40">₺</span>
                  </h3>
                </div>
                <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white transition-all">
                  <CreditCard className="w-6 h-6 text-rose-400 group-hover:text-white" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/[0.03] border-white/10 backdrop-blur-md rounded-3xl group hover:border-cyan-500/30 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">AKTİF TEDARİKÇİ</p>
                  <h3 className="text-3xl font-black text-cyan-400 italic">
                    24 <span className="text-sm font-normal text-white/40">Firma</span>
                  </h3>
                </div>
                <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                  <Factory className="w-6 h-6 text-cyan-400 group-hover:text-white" />
                </div>
              </div>
            </Card>
          </div>

      {/* Purchase List Card */}
      <Card className="bg-white/[0.02] border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-gray-950/50 p-1 rounded-xl border border-white/5 w-fit">
            <button 
              onClick={() => setActiveStatus('all')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeStatus === 'all' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Tümü
            </button>
            <button 
              onClick={() => setActiveStatus('pending')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeStatus === 'pending' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Bekleyen
            </button>
            <button 
              onClick={() => setActiveStatus('completed')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeStatus === 'completed' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Kabul Edilen
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text"
              placeholder="Sipariş no veya tedarikçi ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-950/50 border border-white/10 rounded-xl text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <PageLoader label="Satınalmalar çekiliyor..." />
            </div>
          ) : !data || data.length === 0 ? (
            <EmptyState 
              icon={Boxes}
              title="Sipariş Bulunamadı"
              description="Henüz kayıtlı bir satınalma siparişi bulunmuyor."
            />
          ) : (
            <Table>
              <TableHeader className="bg-white/[0.01]">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-gray-400 font-medium py-4">Sipariş / Tedarikçi</TableHead>
                  <TableHead className="text-gray-400 font-medium">Tarih</TableHead>
                  <TableHead className="text-gray-400 font-medium text-right">Toplam Tutar</TableHead>
                  <TableHead className="text-gray-400 font-medium text-center">Durum</TableHead>
                  <TableHead className="text-gray-400 font-medium text-right px-6">Yönet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((order) => (
                  <TableRow key={order.id} className="border-white/5 group hover:bg-white/[0.03] transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                          <Package className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors uppercase">
                            {order.order_number}
                          </p>
                          <p className="text-[10px] uppercase font-bold text-gray-500 mt-0.5 tracking-widest">
                            {order.supplier_name}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(order.order_date)}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <p className="text-sm font-bold text-white">
                        {order.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                      </p>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="outline" className={statusMap[order.status]?.color || ''}>
                        {statusMap[order.status]?.label || order.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right px-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        {order.status === 'pending' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                            onClick={() => handleUpdateStatus(order.id, 'approved')}
                            disabled={processingId === order.id}
                          >
                            Onayla
                          </Button>
                        )}
                        {order.status === 'approved' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => handleUpdateStatus(order.id, 'completed')}
                            disabled={processingId === order.id}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                            Kabul Et
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {meta && meta.total > PAGE_SIZE && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              Toplam: <span className="text-gray-300 font-bold">{meta.total}</span> Kayıt
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)} className="text-gray-400">
                <ChevronLeft className="w-4 h-4 mr-1" /> Geri
              </Button>
              <Button size="sm" variant="ghost" disabled={(page + 1) * PAGE_SIZE >= meta.total} onClick={() => setPage(page + 1)} className="text-gray-400">
                İleri <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
        </div>
      )}

      {activeTab === 'suppliers' && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-reveal">
            {[1, 2, 3].map(i => (
               <ZenithCard key={i} className="p-8 bg-black/40 border-white/5 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                     <Factory className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">TEDARİKÇİ ANALİZİ</h3>
                  <p className="text-xs text-white/40">Tedarikçi performans puanları ve teslimat süreleri burada analiz edilecek.</p>
                  <Badge variant="glass" className="text-[8px] tracking-[0.2em]">GELECEK GÜNCELLEME</Badge>
               </ZenithCard>
            ))}
         </div>
      )}
    </div>
  )
}
