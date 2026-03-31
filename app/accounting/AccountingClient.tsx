'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  TrendingUp, 
  Activity, 
  Layers, 
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  DollarSign,
  PieChart,
  BarChart3
} from 'lucide-react'
import { fetchApi, useApi } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useRealtime } from '@/hooks/useRealtime'
import { cn } from '@/lib/cn'

type ChartAccount = {
  id: string
  code: string
  name: string
  account_type: string
  parent_id?: string | null
  child_count?: number | null
}

function getAccountTypeLabel(accountType: string): string {
  const typeMap: Record<string, string> = {
    asset: 'Varlık',
    liability: 'Yükümlülük',
    equity: 'Özkaynak',
    revenue: 'Gelir',
    expense: 'Gider',
  }
  return typeMap[accountType] || accountType
}

export default function AccountingClient() {
  const [accounts, setAccounts] = useState<ChartAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState({
    code: '',
    name: '',
    account_type: 'asset',
    parent_id: '',
  })

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApi<ChartAccount[]>('/api/accounting/chart-of-accounts')
      if (Array.isArray(data)) setAccounts(data)
    } catch (err: any) {
      setError(err?.message || 'Hesap planı yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  useRealtime('chart_of_accounts', () => {
    loadAccounts()
  })

  async function createAccount() {
    setError(null)
    setLoading(true)
    try {
      await fetchApi('/api/accounting/chart-of-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          account_type: form.account_type,
          parent_id: form.parent_id || null,
        }),
      })
      setForm({ code: '', name: '', account_type: 'asset', parent_id: '' })
      await loadAccounts()
    } catch (err: any) {
      setError(err?.message || 'Hesap oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  const filteredAccounts = useMemo(() => accounts.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.code.toLowerCase().includes(searchTerm.toLowerCase())
  ), [accounts, searchTerm])

  return (
    <div className="space-y-6 animate-reveal">
      {/* Financial Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'Toplam Hesap', val: accounts.length, icon: Layers, color: 'text-primary' },
           { label: 'Gelir Hesapları', val: accounts.filter(a => a.account_type === 'revenue').length, icon: TrendingUp, color: 'text-success' },
           { label: 'Gider Hesapları', val: accounts.filter(a => a.account_type === 'expense').length, icon: Activity, color: 'text-error' },
           { label: 'Bekleyen Fişler', val: 0, icon: FileText, color: 'text-warning' }
         ].map((stat, i) => (
           <Card key={i} variant="glass" className="hover:scale-[1.02] transition-transform">
              <CardBody className="p-6 flex items-center justify-between">
                 <div>
                    <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-3xl font-black">{stat.val}</p>
                 </div>
                 <div className={cn("p-4 rounded-2xl bg-white/5", stat.color)}>
                    <stat.icon className="w-6 h-6" />
                 </div>
              </CardBody>
           </Card>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Main Chart of Accounts */}
         <div className="lg:col-span-2 space-y-6">
            <Card variant="glass">
               <CardHeader className="p-6 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                     <BookOpen className="w-5 h-5 text-primary" />
                     <h3 className="font-black uppercase tracking-widest text-sm">Tek Düzen Hesap Planı</h3>
                  </div>
                  <div className="relative w-full md:w-64 group">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-primary transition-colors" />
                     <Input 
                        placeholder="Hesap ara..." 
                        className="pl-9 h-9 text-xs" 
                        variant="filled"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                     />
                  </div>
               </CardHeader>
               <CardBody className="p-0">
                  <div className="overflow-x-auto">
                     <table className="w-full">
                        <thead>
                           <tr className="bg-white/5 border-b border-white/5">
                              <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Kod</th>
                              <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Hesap İsmi</th>
                              <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Grup</th>
                              <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-right">Alt Kırılım</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {loading ? (
                              <tr><td colSpan={4} className="py-20 text-center opacity-40 font-black uppercase tracking-widest text-xs">Yükleniyor...</td></tr>
                           ) : filteredAccounts.length === 0 ? (
                              <tr><td colSpan={4} className="py-20 text-center opacity-20 font-black uppercase tracking-widest text-xs">Hesap kaydı bulunamadı</td></tr>
                           ) : (
                              filteredAccounts.map((account) => (
                                 <tr key={account.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-4 font-mono text-primary font-bold text-sm tracking-tighter">{account.code}</td>
                                    <td className="p-4 font-black uppercase text-sm tracking-tight text-foreground/80">{account.name}</td>
                                    <td className="p-4">
                                       <Badge variant="soft" color={account.account_type === 'asset' ? 'primary' : account.account_type === 'revenue' ? 'success' : account.account_type === 'expense' ? 'error' : 'secondary'} className="text-[8px] font-black px-3">
                                          {getAccountTypeLabel(account.account_type).toUpperCase()}
                                       </Badge>
                                    </td>
                                    <td className="p-4 text-right">
                                       <div className="flex items-center justify-end gap-2">
                                          <span className="text-xs font-bold text-foreground/40">{account.child_count || 0}</span>
                                          <ChevronRight className="w-4 h-4 opacity-10 group-hover:opacity-100 group-hover:text-primary transition-all" />
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

         {/* Sidebar Actions & Info */}
         <div className="space-y-6">
            <Card variant="glass" className="bg-primary/5 border-primary/20">
               <CardHeader className="p-6 pb-2">
                  <h3 className="font-black uppercase tracking-widest text-[10px] text-foreground/40">Yeni Hesap Oluştur</h3>
               </CardHeader>
               <CardBody className="p-6 space-y-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Hesap Kodu</label>
                     <Input variant="filled" placeholder="Örn: 100.01" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Hesap Adı</label>
                     <Input variant="filled" placeholder="Kasa Hesabı" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Hesap Tipi</label>
                     <select 
                        value={form.account_type}
                        onChange={(e) => setForm(p => ({ ...p, account_type: e.target.value }))}
                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                     >
                        <option value="asset">Varlık (1xx, 2xx)</option>
                        <option value="liability">Yükümlülük (3xx, 4xx)</option>
                        <option value="equity">Özkaynak (5xx)</option>
                        <option value="revenue">Gelir (6xx)</option>
                        <option value="expense">Gider (7xx)</option>
                     </select>
                  </div>
                  <Button className="w-full mt-4" color="primary" onClick={createAccount} disabled={loading || !form.code || !form.name}>
                     <Plus className="w-4 h-4 mr-2" />
                     Hesabı Kaydet
                  </Button>
                  {error && <p className="text-[10px] font-bold text-error uppercase text-center">{error}</p>}
               </CardBody>
            </Card>

            <Card variant="glass" className="bg-secondary/5 border-secondary/20">
               <CardBody className="p-6">
                  <div className="flex items-center gap-3 text-secondary mb-4">
                     <BarChart3 className="w-5 h-5" />
                     <h4 className="text-xs font-black uppercase tracking-widest">Finansal Raporlar</h4>
                  </div>
                  <div className="space-y-2">
                     <Button variant="ghost" className="w-full justify-between text-xs py-3 h-auto hover:bg-white/5 group">
                        <span className="font-bold opacity-60 group-hover:opacity-100">BİLANÇO</span>
                        <PieChart className="w-4 h-4 opacity-20" />
                     </Button>
                     <Button variant="ghost" className="w-full justify-between text-xs py-3 h-auto hover:bg-white/5 group">
                        <span className="font-bold opacity-60 group-hover:opacity-100">GELİR TABLOSU (P&L)</span>
                        <TrendingUp className="w-4 h-4 opacity-20" />
                     </Button>
                     <Button variant="ghost" className="w-full justify-between text-xs py-3 h-auto hover:bg-white/5 group">
                        <span className="font-bold opacity-60 group-hover:opacity-100">MİZAN</span>
                        <Layers className="w-4 h-4 opacity-20" />
                     </Button>
                  </div>
                  <div className="mt-6 flex items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-bold opacity-30 italic leading-relaxed">
                     <Info className="w-3 h-3 shrink-0" />
                     Bilanço ve P&L verileri yevmiye kayıtlarından otomatik oluşturulur.
                  </div>
               </CardBody>
            </Card>

            <div className="bg-amber-500/5 rounded-3xl p-6 border border-amber-500/10">
               <div className="flex items-center gap-3 mb-3 text-warning">
                  <AlertCircle className="w-5 h-5" />
                  <h4 className="text-xs font-black uppercase tracking-widest">E-Fatura Uyumu</h4>
               </div>
               <p className="text-[11px] font-medium leading-relaxed opacity-40 italic">Bu hesap planı, GİB 1 nolu muhasebe uygulama genel tebliğine (VUK) uygun olarak yapılandırılmıştır.</p>
            </div>
         </div>
      </div>
    </div>
  )
}
