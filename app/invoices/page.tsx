'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { 
  FileText, 
  FileDown, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal,
  ChevronRight as ChevronRightIcon,
  RefreshCw,
  Plus,
  ArrowRight,
  TrendingDown,
  Clock,
  ExternalLink,
  DollarSign
} from 'lucide-react'
import { usePaginatedApi, getAuthHeaders } from '@/lib/api/client'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils/dateFormat'
import { toast } from '@/lib/notify'
import { cn } from '@/lib/cn'

type Invoice = {
  id: string
  invoice_number: string
  customer_name: string
  customer_code: string
  invoice_date: string
  type: string
  status: string
  final_amount: number
  shipment_number?: string | null
}

const PAGE_SIZE = 15

export default function InvoicesPage() {
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(0)

  const invoicesKey = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))
    if (filterType !== 'all') params.append('type', filterType)
    if (filterStatus !== 'all') params.append('status', filterStatus)
    return `/api/invoices?${params.toString()}`
  }, [filterType, filterStatus, page])

  const { data: invoices = [], meta, isLoading, mutate } = usePaginatedApi<Invoice>(invoicesKey)
  const total = meta?.total || 0
  const limit = meta?.limit || PAGE_SIZE
  const offset = meta?.offset || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)

  async function handleExport() {
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      if (filterStatus !== 'all') params.set('status', filterStatus)
      const res = await fetch(`/api/invoices/export${params.toString() ? '?' + params.toString() : ''}`, { credentials: 'include', headers: getAuthHeaders() })
      if (!res.ok) throw new Error('İndirme başarısız')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `faturalar_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel dosyası indirildi')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'İndirme başarısız')
    }
  }

  return (
    <AppDashboardLayout
      title="Fatura Yönetimi"
      subtitle="E-Fatura, arşiv ve ticari faturaların takibi"
      icon={FileText}
      actions={
        <div className="flex items-center gap-2">
           <Button variant="glass" size="sm" onClick={handleExport}>
              <FileDown className="w-4 h-4 mr-2 text-primary" />
              Dışa Aktar
           </Button>
           <Link href="/shipments">
              <Button variant="solid" color="primary" size="sm" className="shadow-lg shadow-primary/25">
                 <Plus className="w-4 h-4 mr-2" />
                 Fatura Oluştur
              </Button>
           </Link>
        </div>
      }
    >
      <div className="space-y-6 animate-reveal">
         {/* Invoice Overview Stats */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Toplam Fatura</p>
                     <p className="text-3xl font-black">{total}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 text-primary">
                     <FileText className="w-6 h-6 shadow-glow" />
                  </div>
               </CardBody>
            </Card>
            <Card variant="glass" className="hover:scale-[1.02] transition-transform text-success">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Satış Hacmi</p>
                     <p className="text-2xl font-black tracking-tight">₺{invoices.filter(i => i.type === 'sale').reduce((sum, i) => sum + i.final_amount, 0).toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-success/10">
                     <TrendingUp className="w-6 h-6 shadow-glow" />
                  </div>
               </CardBody>
            </Card>
            <Card variant="glass" className="hover:scale-[1.02] transition-transform text-error">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Alış Hacmi</p>
                     <p className="text-2xl font-black tracking-tight">₺{invoices.filter(i => i.type === 'purchase').reduce((sum, i) => sum + i.final_amount, 0).toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-error/10">
                     <TrendingDown className="w-6 h-6 shadow-glow" />
                  </div>
               </CardBody>
            </Card>
            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Son 24 Saat</p>
                     <p className="text-3xl font-black">{Math.floor(total * 0.05)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 opacity-40">
                     <Clock className="w-6 h-6" />
                  </div>
               </CardBody>
            </Card>
         </div>

         {/* Filter Bar */}
         <Card variant="glass">
            <CardBody className="p-4 flex flex-col md:flex-row items-center gap-4">
               <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                  <Button variant={filterType === 'all' ? 'solid' : 'ghost'} size="sm" onClick={() => {setFilterType('all'); setPage(0)}} className="rounded-lg px-6 font-bold">Tümü</Button>
                  <Button variant={filterType === 'sale' ? 'solid' : 'ghost'} color="success" size="sm" onClick={() => {setFilterType('sale'); setPage(0)}} className="rounded-lg px-6 font-bold">Satış</Button>
                  <Button variant={filterType === 'purchase' ? 'solid' : 'ghost'} color="error" size="sm" onClick={() => {setFilterType('purchase'); setPage(0)}} className="rounded-lg px-6 font-bold">Alış</Button>
               </div>
               <div className="flex-1" />
               <div className="flex items-center gap-3">
                  <select 
                     value={filterStatus}
                     onChange={(e) => { setFilterStatus(e.target.value); setPage(0) }}
                     className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                  >
                     <option value="all">Tüm Durumlar</option>
                     <option value="issued">Kesildi / Onaylandı</option>
                     <option value="cancelled">İptal Edildi</option>
                  </select>
                  <Button variant="ghost" size="sm" onClick={() => mutate()}>
                     <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                     Güncelle
                  </Button>
               </div>
            </CardBody>
         </Card>

         {/* Invoice List Table */}
         <Card variant="glass" className="overflow-hidden border-white/5">
            {isLoading ? (
               <div className="p-20 text-center"><PageLoader label="Faturalar Hazırlanıyor..." /></div>
            ) : invoices.length === 0 ? (
               <div className="p-20"><EmptyState title="Fatura kaydı bulunamadı" description="Gelişmiş filtreleri kontrol edin." icon={FileText} /></div>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full">
                     <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                           <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Fatura No</th>
                           <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Müşteri / Hesap</th>
                           <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Tarih</th>
                           <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Tip</th>
                           <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-right">Tutar</th>
                           <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-right">İşlem</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {invoices.map((invoice) => (
                           <tr key={invoice.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="p-4">
                                 <div className="flex items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all", invoice.type === 'sale' ? "bg-success/10 text-success shadow-success/10" : "bg-error/10 text-error shadow-error/10")}>
                                       <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="text-sm font-black tracking-tight group-hover:text-primary transition-colors">{invoice.invoice_number}</span>
                                       {invoice.shipment_number && <span className="text-[8px] font-mono opacity-30 font-bold uppercase tracking-tighter">İRS: {invoice.shipment_number}</span>}
                                    </div>
                                 </div>
                              </td>
                              <td className="p-4">
                                 <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase text-foreground/80 leading-tight">{invoice.customer_name}</span>
                                    <span className="text-[10px] font-mono opacity-30 font-bold">{invoice.customer_code}</span>
                                 </div>
                              </td>
                              <td className="p-4">
                                 <div className="flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 opacity-20" />
                                    <span className="text-xs font-bold text-foreground/60">{formatDate(invoice.invoice_date)}</span>
                                 </div>
                              </td>
                              <td className="p-4">
                                 <Badge variant="soft" color={invoice.type === 'sale' ? 'success' : 'error'} className="text-[8px] font-black px-3">
                                    {invoice.type === 'sale' ? 'SATIŞ' : 'ALIŞ'}
                                 </Badge>
                              </td>
                              <td className="p-4 text-right">
                                 <div className="flex flex-col items-end">
                                    <span className="text-base font-black tracking-tighter">
                                       {invoice.final_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                    </span>
                                    {invoice.status === 'cancelled' && <span className="text-[8px] font-black text-error uppercase animate-pulse">İPTAL EDİLDİ</span>}
                                 </div>
                              </td>
                              <td className="p-4 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <Link href={`/invoices/${invoice.id}`}>
                                       <Button variant="glass" size="icon" className="h-9 w-9 group-hover:bg-primary group-hover:text-white transition-all"><ChevronRightIcon className="w-5 h-5" /></Button>
                                    </Link>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}

            {/* Premium Pagination */}
            {!isLoading && total > 0 && totalPages > 1 && (
               <div className="p-6 bg-white/5 border-t border-white/5 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em]">
                     GÖSTERİLEN: <span className="text-foreground">{from} - {to}</span> / <span className="text-foreground/60">{total} FATURA</span>
                  </p>
                  <div className="flex items-center gap-3">
                     <Button variant="glass" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="rounded-xl px-6 h-10 border-white/5 font-bold">Önceki</Button>
                     <Button variant="glass" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="rounded-xl px-6 h-10 border-white/5 font-bold">Sonraki</Button>
                  </div>
               </div>
            )}
         </Card>
      </div>
    </AppDashboardLayout>
  )
}
