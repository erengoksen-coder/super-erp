'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Truck, 
  Edit, 
  Save, 
  X, 
  Percent, 
  DollarSign, 
  ChevronDown, 
  ChevronRight, 
  Trash2,
  Users,
  Wallet,
  AlertCircle,
  TrendingUp,
  Activity,
  History,
  FileText,
  Calendar,
  CheckCircle2,
  MoreHorizontal,
  Info,
  Package
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { fetchApi } from '@/lib/api/client'
import { formatDate, formatDateTime } from '@/lib/utils/dateFormat'
import { toast } from '@/lib/notify'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/cn'
import { getReferenceTypeLabel } from '@/lib/utils/referenceTypeLabels'

interface Account {
  id: string
  code: string
  name: string
  type: string
  tax_number?: string
  phone?: string
  email?: string
  address?: string
  balance: number
  risk_limit?: number | null
  discount_rate?: number | null
}

interface Shipment {
  id: string
  shipment_number: string
  shipment_date: string
  total_quantity: number
  total_amount: number
  discount_rate?: number | null
  tax_rate: number
  tax_amount: number
  final_amount: number
  status: string
}

interface AccountTransaction {
  id: string
  account_id: string
  transaction_type: 'debit' | 'credit'
  amount: number
  reference_type?: string
  reference_id?: string
  description?: string
  created_at: string
  product_name?: string
  product_sku?: string
  quantity?: number
  unit_price?: number
  total_price?: number
  shipment_number?: string
  shipment_discount_rate?: number | null
  shipment_status?: string | null
}

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [transactions, setTransactions] = useState<AccountTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [printStartDate, setPrintStartDate] = useState<string>('')
  const [printEndDate, setPrintEndDate] = useState<string>('')
  const [clearingData, setClearingData] = useState(false)
  const [applyingDiscount, setApplyingDiscount] = useState(false)
  const [confirmClearData, setConfirmClearData] = useState(false)
  const [confirmApplyDiscount, setConfirmApplyDiscount] = useState(false)

  useEffect(() => {
    const id = params?.id as string
    if (id && id !== 'undefined') {
      loadData(id)
    }
  }, [params?.id])

  async function loadData(id: string) {
    setLoading(true)
    try {
      const [acc, shp, trx] = await Promise.all([
        fetchApi<Account>(`/api/accounts/${id}`),
        fetchApi<Shipment[]>(`/api/shipments?customer_id=${id}`).catch(() => []),
        fetchApi<AccountTransaction[]>(`/api/accounts/${id}/transactions`).catch(() => [])
      ])
      setAccount(acc)
      setShipments(shp || [])
      setTransactions(trx || [])
    } catch (e: any) {
      toast.error('Veri yüklenemedi')
      router.push('/accounts')
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = useMemo(() => {
    if (!printStartDate && !printEndDate) return transactions
    return transactions.filter(t => {
      const date = t.created_at.split('T')[0]
      if (printStartDate && date < printStartDate) return false
      if (printEndDate && date > printEndDate) return false
      return true
    })
  }, [transactions, printStartDate, printEndDate])

  const executeClearAccountData = async () => {
    if (!account) return
    setConfirmClearData(false)
    setClearingData(true)
    try {
      await fetchApi(`/api/accounts/${account.id}/clear-data`, { method: 'POST' })
      toast.success('Girdi verileri temizlendi')
      loadData(account.id)
    } catch (e: any) { toast.error(e.message) }
    finally { setClearingData(false) }
  }

  const executeApplyDiscount = async () => {
    if (!account) return
    setConfirmApplyDiscount(false)
    setApplyingDiscount(true)
    try {
      await fetchApi(`/api/accounts/${account.id}/apply-discount-to-shipments`, { method: 'POST' })
      toast.success('İskonto uygulandı')
      loadData(account.id)
    } catch (e: any) { toast.error(e.message) }
    finally { setApplyingDiscount(false) }
  }

  if (loading) {
    return (
      <AppDashboardLayout title="Cari Detay" icon={Users}>
         <div className="flex flex-col items-center justify-center p-20 animate-pulse">
            <div className="text-center opacity-40 font-black uppercase tracking-widest text-lg">Cari Verileri Yükleniyor...</div>
         </div>
      </AppDashboardLayout>
    )
  }

  if (!account) return null

  return (
    <AppDashboardLayout
      title={account.name}
      subtitle={`Cari Kod: ${account.code} • ${account.type === 'customer' ? 'MÜŞTERİ' : 'TEDARİKÇİ'}`}
      icon={Users}
      actions={
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri Dön
           </Button>
           {account.type === 'customer' && (
              <Button variant="soft" color="error" size="sm" onClick={() => setConfirmClearData(true)}>
                 <Trash2 className="w-4 h-4 mr-2" />
                 Verileri Sıfırla
              </Button>
           )}
        </div>
      }
    >
      <div className="space-y-6 animate-reveal">
         {/* Top Stats */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Cari Bakiye</p>
                     <p className={cn("text-3xl font-black", account.balance > 0 ? "text-error" : "text-success")}>
                        {account.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} <span className="text-sm font-medium opacity-30">₺</span>
                     </p>
                     <Badge variant="soft" color={account.balance > 0 ? 'error' : 'success'} className="mt-2 text-[8px] font-black">
                        {account.balance > 0 ? 'BORÇLU (MÜŞTERİ)' : 'ALACAKLI (BİZ)'}
                     </Badge>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5">
                     <Wallet className="w-6 h-6 text-primary shadow-glow" />
                  </div>
               </CardBody>
            </Card>

            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Risk Limiti</p>
                     <p className="text-3xl font-black text-foreground">
                        {(account.risk_limit || 0).toLocaleString('tr-TR')} <span className="text-sm font-medium opacity-30">₺</span>
                     </p>
                     <div className="w-32 h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-warning shadow-glow" style={{ width: `${Math.min(((account.balance > 0 ? account.balance : 0) / (account.risk_limit || 1)) * 100, 100)}%` }} />
                     </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 text-warning">
                     <AlertCircle className="w-6 h-6" />
                  </div>
               </CardBody>
            </Card>

            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">İskonto Oranı</p>
                     <p className="text-3xl font-black text-secondary">
                        %{(account.discount_rate || 0).toFixed(2)}
                     </p>
                     {(account.discount_rate || 0) > 0 && (
                        <Button variant="soft" color="secondary" size="xs" className="mt-2" onClick={() => setConfirmApplyDiscount(true)}>
                           <Percent className="w-3 h-3 mr-1" /> Tümüne Uygula
                        </Button>
                     )}
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 text-secondary">
                     <TrendingUp className="w-6 h-6" />
                  </div>
               </CardBody>
            </Card>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
               {/* Date Filter */}
               <Card variant="glass" className="no-print">
                  <CardBody className="p-4 flex flex-col md:flex-row items-center gap-4">
                     <div className="flex items-center gap-3 flex-1 w-full">
                        <Calendar className="w-5 h-5 opacity-20" />
                        <Input type="date" variant="filled" className="flex-1" value={printStartDate} onChange={e => setPrintStartDate(e.target.value)} />
                        <ChevronRight className="w-4 h-4 opacity-10" />
                        <Input type="date" variant="filled" className="flex-1" value={printEndDate} onChange={e => setPrintEndDate(e.target.value)} />
                     </div>
                     <div className="flex items-center gap-2">
                        <Button variant="glass" size="sm" onClick={() => { setPrintStartDate(''); setPrintEndDate(''); }}>Temizle</Button>
                        <Button variant="solid" color="primary" size="sm" onClick={() => window.print()}>
                           <FileText className="w-4 h-4 mr-2" /> Yazdır (Ekstre)
                        </Button>
                     </div>
                  </CardBody>
               </Card>

               {/* Transactions Table */}
               <Card variant="glass">
                  <CardHeader className="p-6 border-b border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <History className="w-5 h-5 text-primary" />
                        <h3 className="font-black uppercase tracking-widest text-sm">Cari Hesap Ekstresi / İşlemler</h3>
                     </div>
                  </CardHeader>
                  <CardBody className="p-0">
                     <div className="overflow-x-auto">
                        <table className="w-full">
                           <thead>
                              <tr className="bg-white/5 border-b border-white/5">
                                 <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Tarih</th>
                                 <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Açıklama</th>
                                 <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-right">Miktar / BOM</th>
                                 <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-right">Borç (+)</th>
                                 <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-right">Alacak (-)</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                              {filteredTransactions.length === 0 ? (
                                 <tr><td colSpan={5} className="py-20 text-center opacity-20 font-black uppercase tracking-widest text-xs">İşlem bulunamadı</td></tr>
                              ) : (
                                 filteredTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                                       <td className="p-4">
                                          <div className="flex flex-col">
                                             <span className="text-xs font-bold">{formatDateTime(t.created_at)}</span>
                                             {t.shipment_number && <span className="text-[8px] font-mono text-primary font-bold">#{t.shipment_number}</span>}
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <div className="flex flex-col max-w-[240px]">
                                             <span className="text-xs font-black uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                                                {t.product_name || (t.description?.replace(/❖/g, '₺') || '-')}
                                             </span>
                                             {t.product_sku && <span className="text-[9px] font-mono opacity-40">{t.product_sku}</span>}
                                             {t.shipment_status === 'cancelled' && <Badge color="error" className="text-[7px] w-fit mt-1">İPTAL EDİLDİ</Badge>}
                                          </div>
                                       </td>
                                       <td className="p-4 text-right">
                                           {t.quantity ? (
                                              <div className="flex flex-col">
                                                 <span className="text-xs font-black">{t.quantity} ADET</span>
                                                 {t.unit_price && <span className="text-[9px] opacity-40 italic">BOM: ₺{t.unit_price.toLocaleString()}</span>}
                                              </div>
                                           ) : '-'}
                                       </td>
                                       <td className="p-4 text-right">
                                          {t.transaction_type === 'debit' ? (
                                             <span className="text-sm font-black text-error">
                                                {t.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                             </span>
                                          ) : '-'}
                                       </td>
                                       <td className="p-4 text-right">
                                          {t.transaction_type === 'credit' ? (
                                             <span className="text-sm font-black text-success">
                                                {t.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                             </span>
                                          ) : '-'}
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
               <Card variant="glass" className="bg-secondary/5 border-secondary/20">
                  <CardHeader className="p-6 pb-2">
                     <h3 className="font-black uppercase tracking-widest text-[10px] text-foreground/40">İletişim & Vergi</h3>
                  </CardHeader>
                  <CardBody className="p-6 space-y-6">
                     <div>
                        <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest mb-1">Vergi No / Dairesi</p>
                        <p className="text-sm font-black uppercase text-foreground/80">{account.tax_number || 'BELİRTİLMEMİŞ'}</p>
                     </div>
                     <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest mb-1">Telefon / E-Posta</p>
                        <p className="text-sm font-black text-foreground/80">{account.phone || '-'}</p>
                        <p className="text-xs font-medium text-primary mt-1">{account.email || '-'}</p>
                     </div>
                     <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] font-black text-foreground/20 uppercase tracking-widest mb-1">Adres Bilgisi</p>
                        <p className="text-xs font-medium text-foreground/40 leading-relaxed uppercase">{account.address || 'ADRES KAYDI BULUNAMADI'}</p>
                     </div>
                  </CardBody>
               </Card>

               <Card variant="glass" className="bg-amber-500/5 border-amber-500/20">
                  <CardBody className="p-6">
                     <div className="flex items-center gap-3 text-warning mb-4">
                        <Activity className="w-5 h-5" />
                        <h4 className="text-xs font-black uppercase tracking-widest">Bakiye Analizi</h4>
                     </div>
                     <div className="space-y-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                           <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Borç Yaşlandırma</p>
                           <p className="text-xl font-black">0-30 GÜN</p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold opacity-30 italic leading-relaxed">
                           <Info className="w-3 h-3 shrink-0" />
                           {account.balance > 0 ? "Bu cari hesap şu an borçlu durumdadır. Risk limiti kontrol edilmektedir." : "Cari hesapta alacak bakiye bulunmaktadır."}
                        </div>
                     </div>
                  </CardBody>
               </Card>

               <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
                  <div className="flex items-center gap-3 mb-4 text-primary">
                     <Truck className="w-5 h-5" />
                     <h4 className="text-xs font-black uppercase tracking-widest">Son Sevkiyatlar</h4>
                  </div>
                  <div className="space-y-4">
                     {shipments.slice(0, 3).map((s) => (
                        <div key={s.id} className="flex items-center justify-between group cursor-pointer" onClick={() => router.push(`/shipments/${s.id}`)}>
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black group-hover:text-primary transition-colors">{s.shipment_number}</span>
                              <span className="text-[9px] opacity-30">{s.shipment_date}</span>
                           </div>
                           <Badge variant="glass" className="text-[8px]">{s.status?.toUpperCase()}</Badge>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>

      <ConfirmDialog 
        isOpen={confirmClearData}
        onClose={() => setConfirmClearData(false)}
        onConfirm={executeClearAccountData}
        title="Girdi Verilerini Sil"
        message="Cari hareketler ve sevkiyat verileri kalıcı olarak silinecektir. Emin misiniz?"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={confirmApplyDiscount}
        onClose={() => setConfirmApplyDiscount(false)}
        onConfirm={executeApplyDiscount}
        title="İskonto Uygula"
        message={`%${account.discount_rate?.toFixed(2)} iskonto tüm sevkiyatlara uygulanacaktır. Devam?`}
        variant="warning"
      />
    </AppDashboardLayout>
  )
}
