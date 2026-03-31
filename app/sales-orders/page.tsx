'use client'

import { useState, useMemo } from 'react'
import { 
  Plus, Search, ClipboardList, Package, 
  Truck, CheckCircle2, AlertCircle, X,
  ArrowUpRight, ArrowDownRight, MoreVertical,
  Calendar, CreditCard, ShoppingBag, FileText, ChevronLeft, ChevronRight
} from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { LogoWithBackground } from '@/components/Logo'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { usePaginatedApi, getAuthHeaders } from '@/lib/api/client'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { formatDate } from '@/lib/utils/dateFormat'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type SalesOrder = {
  id: string
  order_number: string
  order_date: string
  status: 'pending' | 'approved' | 'in_production' | 'completed' | 'cancelled'
  total_amount: number
  customer_name: string
  customer_code: string
}

export default function SalesOrdersPage() {
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
    return `/api/sales-orders?${params.toString()}`
  }, [activeStatus, page, debouncedSearch])

  const { data, meta, isLoading, mutate } = usePaginatedApi<SalesOrder>(apiUrl)

  // Sevkiyat İşlemi (Phase 4 Otomasyonu)
  const handleShipOrder = async (orderId: string) => {
    try {
      setProcessingId(orderId)
      const res = await fetch(`/api/sales-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ action: 'ship' })
      })
      
      if (!res.ok) throw new Error('Sevkiyat işlemi başlatılamadı')
      
      toast.success('Sipariş sevk edildi, stoklar düşüldü ve otomatik fatura oluşturuldu!')
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
    in_production: { label: 'Üretimde', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    completed: { label: 'Tamamlandı', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    cancelled: { label: 'İptal', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-xl">
              <ShoppingBag className="w-6 h-6 text-rose-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Satış Siparişleri</h1>
            <Badge className="bg-rose-500/10 text-rose-400 border-none px-2 py-0.5 ml-2">OTOMASYON AKTİF</Badge>
          </div>
          <p className="text-gray-400 mt-1 flex items-center gap-2 text-sm italic">
            Müşteri siparişlerini izleyin, sevk edin ve finansal süreci otomatikleştirin
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-white/10 text-gray-300">
            <FileText className="w-4 h-4 mr-2" />
            Excel'den Yükle
          </Button>
          <Button 
            className="bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/20 text-white"
            onClick={() => setShowNewModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Satış Siparişi
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white/[0.03] border-white/10 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bekleyen Siparişler</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {isLoading ? '...' : (meta.total || 0)}
              </h3>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white/[0.03] border-white/10 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Toplam Ciro (Aylık)</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                124.500 <span className="text-sm font-normal text-gray-400">₺</span>
              </h3>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white/[0.03] border-white/10 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Aktif Sevkiyatlar</p>
              <h3 className="text-2xl font-bold text-blue-400 mt-1">
                8 <span className="text-sm font-normal text-gray-400">Hat</span>
              </h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Truck className="w-4 h-4 text-blue-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Sipariş Listesi Card */}
      <Card className="bg-white/[0.02] border-white/10 backdrop-blur-xl transition-all shadow-2xl">
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-gray-950/50 p-1 rounded-xl border border-white/5 w-fit">
            <button 
              onClick={() => setActiveStatus('all')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeStatus === 'all' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
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
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeStatus === 'completed' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Kapanan
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text"
              placeholder="Sipariş no veya müşteri ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-950/50 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-rose-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <PageLoader label="Siparişler listeleniyor..." />
            </div>
          ) : !data || data.length === 0 ? (
            <EmptyState 
              icon={ShoppingBag}
              title="Sipariş Bulunamadı"
              description="Sistemde henüz kayıtlı bir satış siparişi bulunmuyor."
            />
          ) : (
            <Table>
              <TableHeader className="bg-white/[0.01]">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-gray-400 font-medium py-4">Sipariş / Müşteri</TableHead>
                  <TableHead className="text-gray-400 font-medium">Tarih</TableHead>
                  <TableHead className="text-gray-400 font-medium text-right">Tutar</TableHead>
                  <TableHead className="text-gray-400 font-medium">Durum</TableHead>
                  <TableHead className="text-gray-400 font-medium text-right px-6">Hızlı İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((order) => (
                  <TableRow key={order.id} className="border-white/5 group hover:bg-white/[0.03] transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                          <ClipboardList className="w-5 h-5 text-rose-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors uppercase">
                            {order.order_number}
                          </p>
                          <p className="text-[10px] uppercase font-bold text-gray-500 mt-0.5 tracking-widest">
                            {order.customer_name}
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

                    <TableCell>
                      <Badge variant="outline" className={statusMap[order.status]?.color || ''}>
                        {statusMap[order.status]?.label || order.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right px-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        {order.status !== 'completed' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                            onClick={() => handleShipOrder(order.id)}
                            disabled={processingId === order.id}
                          >
                            <Truck className="w-3.5 h-3.5 mr-1.5" />
                            {processingId === order.id ? 'Sevk Ediliyor...' : 'Sevk Et'}
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
      </Card>
    </div>
  )
}
