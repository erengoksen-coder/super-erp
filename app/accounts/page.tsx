'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  Plus, Search, Users, Building2, Edit, Trash2, 
  FileDown, ChevronLeft, ChevronRight, Filter, 
  ArrowUpRight, ArrowDownRight, MoreVertical,
  CheckCircle2, AlertCircle, Wallet, ArrowRight
} from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { LogoWithBackground } from '@/components/Logo'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { usePaginatedApi, getAuthHeaders } from '@/lib/api/client'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { formatDate } from '@/lib/utils/dateFormat'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { agiAudio } from '@/lib/utils/audio'
import { cn } from '@/lib/cn'

interface Account {
  id: string
  code: string
  name: string
  type: 'customer' | 'vendor'
  tax_number?: string
  phone?: string
  email?: string
  address?: string
  balance: number
  risk_limit?: number
  discount_rate?: number
  created_at: string
}

export default function AccountsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'customer' | 'vendor'>('all')
  const [page, setPage] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState<Account | null>(null)
  
  const debouncedSearch = useDebounce(searchTerm, 300)
  const PAGE_SIZE = 12

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))
    if (activeTab !== 'all') params.set('type', activeTab)
    if (debouncedSearch) params.set('search', debouncedSearch)
    return `/api/accounts?${params.toString()}`
  }, [activeTab, page, debouncedSearch])

  const { data, meta, isLoading, mutate } = usePaginatedApi<Account>(apiUrl)
  
  const stats = useMemo(() => {
    if (!data) return { total: 0, customers: 0, vendors: 0, balance: 0 }
    return {
      total: meta?.total || 0,
      customers: data.filter(a => a.type === 'customer').length,
      vendors: data.filter(a => a.type === 'vendor').length,
      balance: data.reduce((sum, a) => sum + (a.balance || 0), 0)
    }
  }, [data, meta?.total])

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      const res = await fetch(`/api/accounts/${confirmDelete.id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (!res.ok) throw new Error('Silme işlemi başarısız')
      toast.success('Cari hesap başarıyla silindi')
      mutate()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <AppDashboardLayout
      title="Cari Hesap Yönetimi"
      subtitle="Müşteri ve tedarikçi kartlarını, bakiye ve risk limitlerini takip edin"
      icon={Users}
      className="animate-reveal"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="soft" color="secondary" size="sm" onClick={() => {
            if (!data || data.length === 0) {
              toast.error('Dışa aktarılacak veri bulunamadı');
              return;
            }
            const headers = ['id', 'code', 'name', 'type', 'tax_number', 'phone', 'email', 'balance', 'risk_limit'];
            const csvRows = [
              headers.join(','),
              ...data.map(a => headers.map(h => `"${(a as any)[h] || ''}"`).join(','))
            ];
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `cari-hesaplar-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Excel/CSV başarıyla indirildi');
          }}>
            <FileDown className="w-4 h-4 mr-2" />
            Dışa Aktar
          </Button>
          <Link href="/accounts/new">
            <Button variant="solid" color="primary" size="sm" className="shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Cari Kart
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-8 pb-10">
        {/* KPI Section - Platinum */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-reveal">
           <Card variant="glass" className="group">
              <CardBody className="p-6 flex items-center justify-between">
                 <div>
                    <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1">Toplam Cari</p>
                    <h3 className="text-3xl font-black text-foreground">{meta?.total || 0}</h3>
                 </div>
                 <div className="p-4 bg-primary/10 rounded-2xl group-hover:scale-110 transition-all">
                    <Users className="w-6 h-6 text-primary shadow-glow" />
                 </div>
              </CardBody>
           </Card>
           
           <Card variant="glass" className="group">
              <CardBody className="p-6 flex items-center justify-between">
                 <div>
                    <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1 text-emerald-500">Müşteriler</p>
                    <h3 className="text-3xl font-black text-foreground">{stats.customers}</h3>
                 </div>
                 <div className="p-4 bg-emerald-500/10 rounded-2xl group-hover:scale-110 transition-all">
                    <ArrowUpRight className="w-6 h-6 text-emerald-500 shadow-[0_0_10px_emerald]" />
                 </div>
              </CardBody>
           </Card>

           <Card variant="glass" className="group">
              <CardBody className="p-6 flex items-center justify-between">
                 <div>
                    <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1 text-amber-500">Tedarikçiler</p>
                    <h3 className="text-3xl font-black text-foreground">{stats.vendors}</h3>
                 </div>
                 <div className="p-4 bg-amber-500/10 rounded-2xl group-hover:scale-110 transition-all">
                    <ArrowDownRight className="w-6 h-6 text-amber-500 shadow-[0_0_10px_amber]" />
                 </div>
              </CardBody>
           </Card>

           <Card variant="glass" className="group">
              <CardBody className="p-6 flex items-center justify-between">
                 <div>
                    <p className="text-[10px] font-black text-foreground/40 uppercase tracking-widest mb-1">Net Bakiye</p>
                    <h3 className="text-2xl font-black text-foreground tracking-tight">
                       {stats.balance.toLocaleString('tr-TR')} <span className="text-sm font-normal text-foreground/40">₺</span>
                    </h3>
                 </div>
                 <div className="p-4 bg-purple-500/10 rounded-2xl group-hover:scale-110 transition-all">
                    <Wallet className="w-6 h-6 text-purple-500 shadow-[0_0_10px_purple]" />
                 </div>
              </CardBody>
           </Card>
        </div>

        {/* Toolbar & Search */}
        <Card variant="glass" className="animate-reveal" style={{ animationDelay: '100ms' }}>
           <CardBody className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                {[
                  { id: 'all', label: 'Tümü' },
                  { id: 'customer', label: 'Müşteriler' },
                  { id: 'vendor', label: 'Tedarikçiler' }
                ].map((t) => (
                  <Button
                    key={t.id}
                    variant={activeTab === t.id ? 'solid' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      agiAudio.playClick()
                      setActiveTab(t.id as any)
                    }}
                    className="rounded-lg px-6 font-bold"
                  >
                    {t.label}
                  </Button>
                ))}
              </div>

              <Input
                placeholder="Cari adı, kodu veya vergi no ara..."
                leftIcon={<Search className="w-5 h-5 opacity-40" />}
                value={searchTerm}
                onFocus={() => agiAudio.playClick()}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-96"
                variant="filled"
              />
           </CardBody>
        </Card>

        {/* Table Section */}
        <Card variant="glass" className="overflow-hidden border-white/5 animate-reveal" style={{ animationDelay: '200ms' }}>
           {isLoading ? (
             <div className="p-20 text-center"><PageLoader label="Cari kartlar çekiliyor..." /></div>
           ) : !data || data.length === 0 ? (
             <div className="p-20"><EmptyState icon={Users} title="Cari bulunamadı" description="Farklı bir arama kriteri deneyin." /></div>
           ) : (
             <div className="overflow-x-auto">
               <Table>
                 <TableHeader className="bg-white/5">
                   <TableRow className="border-white/5 hover:bg-transparent">
                     <TableHead className="text-foreground/40 font-black py-4 uppercase tracking-[0.2em] text-[10px]">Cari Detayı</TableHead>
                     <TableHead className="text-foreground/40 font-black py-4 uppercase tracking-[0.2em] text-[10px]">Tür</TableHead>
                     <TableHead className="text-foreground/40 font-black py-4 uppercase tracking-[0.2em] text-[10px]">Vergi / İletişim</TableHead>
                     <TableHead className="text-foreground/40 font-black py-4 text-right uppercase tracking-[0.2em] text-[10px]">Bakiye</TableHead>
                     <TableHead className="text-foreground/40 font-black py-4 text-center uppercase tracking-[0.2em] text-[10px]">İşlemler</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {data.map((account) => (
                     <TableRow key={account.id} className="border-white/5 group hover:bg-white/5 transition-all">
                       <TableCell className="py-4">
                         <div className="flex items-center gap-4">
                           <div className={cn(
                             "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-lg group-hover:scale-110 transition-all",
                             account.type === 'customer' ? 'bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10' : 'bg-amber-500/10 text-amber-500 shadow-amber-500/10'
                           )}>
                             {account.name.substring(0, 2).toUpperCase()}
                           </div>
                           <div>
                             <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors uppercase tracking-tight leading-tight mb-1">
                                {account.name}
                             </p>
                             <p className="text-[10px] font-mono text-foreground/30 font-bold uppercase">
                                {account.code}
                             </p>
                           </div>
                         </div>
                       </TableCell>
                       
                       <TableCell>
                         <Badge 
                            variant="soft" 
                            color={account.type === 'customer' ? 'success' : 'warning'}
                            className="font-bold tracking-widest text-[9px]"
                         >
                            {account.type === 'customer' ? 'MÜŞTERİ' : 'TEDARİKÇİ'}
                         </Badge>
                       </TableCell>

                       <TableCell>
                         <div className="space-y-1">
                           <p className="text-xs text-foreground/60 font-medium">{account.tax_number || 'BELİRTİLMEMİŞ'}</p>
                           <p className="text-[10px] text-foreground/30 flex items-center gap-1.5 font-bold">
                             <AlertCircle className="w-3 h-3" />
                             {account.phone || 'SİSTEMDE KAYITLI DEĞİL'}
                           </p>
                         </div>
                       </TableCell>

                       <TableCell className="text-right">
                         <div className="space-y-0.5">
                           <p className={cn("text-base font-black tracking-tight", account.balance > 0 ? 'text-red-500' : 'text-emerald-500')}>
                             {account.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-xs font-normal opacity-40">₺</span>
                           </p>
                           {account.risk_limit && (
                             <p className="text-[9px] text-foreground/20 uppercase tracking-[0.2em] font-bold">
                               RİSK LİMİTİ: {account.risk_limit.toLocaleString('tr-TR')} ₺
                             </p>
                           )}
                         </div>
                       </TableCell>

                       <TableCell className="text-right px-6">
                         <div className="flex items-center justify-end gap-2">
                           <Link href={`/accounts/${account.id}`}>
                             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10" title="Görüntüle">
                               <ArrowRight className="w-4 h-4 shadow-glow" />
                             </Button>
                           </Link>
                             <Link href={`/accounts/${account.id}/edit`}>
                               <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-amber-500 hover:bg-amber-500/10" title="Düzenle">
                                 <Edit className="w-4 h-4 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                               </Button>
                             </Link>
                             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-500/10" onClick={() => setConfirmDelete(account)} title="Sil">
                               <Trash2 className="w-4 h-4 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                             </Button>
                         </div>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
           )}

           {/* Pagination - Modernized */}
           {meta && meta.total > PAGE_SIZE && (
             <div className="p-6 bg-white/5 border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em]">
                   GÖSTERİLEN: <span className="text-foreground">{(page * PAGE_SIZE) + 1} - {Math.min((page + 1) * PAGE_SIZE, meta.total)}</span> / <span className="text-foreground/60">{meta.total} CARİ</span>
                </p>
                <div className="flex items-center gap-3">
                   <Button variant="glass" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="rounded-xl px-6 h-10 border-white/5 font-bold">Önceki</Button>
                   <Button variant="glass" size="sm" disabled={(page + 1) * PAGE_SIZE >= meta.total} onClick={() => setPage(p => p + 1)} className="rounded-xl px-6 h-10 border-white/5 font-bold">Sonraki</Button>
                </div>
             </div>
           )}
        </Card>
      </div>

      <ConfirmDialog 
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Cari Kartı Sil"
        message={`"${confirmDelete?.name}" adına kayıtlı cari kart silinecek. Tüm bakiye ve hareket geçmişi arşive alınacaktır. Devam etmek istiyor musunuz?`}
        variant="danger"
      />
    </AppDashboardLayout>
  )
}
