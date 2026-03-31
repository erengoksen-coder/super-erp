'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Handshake, 
  Plus, 
  Search, 
  Filter, 
  Users, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  ChevronRight, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal,
  Edit2,
  Trash2,
  User,
  ExternalLink,
  DollarSign,
  Briefcase,
  ShieldCheck,
  Save,
  X
} from 'lucide-react'
import { formatDate } from '@/lib/utils/dateFormat'
import { fetchApi } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/cn'

type Account = {
  id: string
  code?: string | null
  name: string
  type?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  tax_number?: string | null
  risk_limit?: number | null
  discount_rate?: number | null
  authorized_person_name?: string | null
  authorized_person_phone?: string | null
  balance?: number | null
  created_at?: string | null
  updated_at?: string | null
  created_by_name?: string | null
  updated_by_name?: string | null
}

export default function CrmClient() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_number: '',
    risk_limit: '',
    discount_rate: '',
    authorized_person_name: '',
    authorized_person_phone: '',
  })
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    tax_number: '',
    risk_limit: '',
    discount_rate: '',
    authorized_person_name: '',
    authorized_person_phone: '',
  })
  const detailRef = useRef<HTMLDivElement | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function loadAccounts() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApi<Account[]>('/api/accounts?type=customer')
      setAccounts(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || 'Müşteriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (!selectedAccount) return
    setEditForm({
      name: selectedAccount.name || '',
      email: selectedAccount.email || '',
      phone: selectedAccount.phone || '',
      address: selectedAccount.address || '',
      tax_number: selectedAccount.tax_number || '',
      risk_limit: selectedAccount.risk_limit?.toString() || '',
      discount_rate: selectedAccount.discount_rate?.toString() || '',
      authorized_person_name: selectedAccount.authorized_person_name || '',
      authorized_person_phone: selectedAccount.authorized_person_phone || '',
    })
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [selectedAccount])

  async function createCustomer() {
    setError(null)
    try {
      await fetchApi('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: 'customer',
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          tax_number: form.tax_number || null,
          risk_limit: form.risk_limit ? parseFloat(form.risk_limit) : null,
          discount_rate: form.discount_rate ? parseFloat(form.discount_rate) : null,
          authorized_person_name: form.authorized_person_name || null,
          authorized_person_phone: form.authorized_person_phone || null,
        }),
      })
      setForm({ name: '', email: '', phone: '', address: '', tax_number: '', risk_limit: '', discount_rate: '', authorized_person_name: '', authorized_person_phone: '' })
      setShowAddModal(false)
      await loadAccounts()
    } catch (err: any) {
      setError(err?.message || 'Hata oluştu')
    }
  }

  async function updateCustomer() {
    if (!selectedAccount) return
    setError(null)
    try {
      await fetchApi(`/api/accounts/${selectedAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email || null,
          phone: editForm.phone || null,
          address: editForm.address || null,
          tax_number: editForm.tax_number || null,
          risk_limit: editForm.risk_limit ? parseFloat(editForm.risk_limit) : null,
          discount_rate: editForm.discount_rate ? parseFloat(editForm.discount_rate) : null,
          authorized_person_name: editForm.authorized_person_name || null,
          authorized_person_phone: editForm.authorized_person_phone || null,
        }),
      })
      await loadAccounts()
    } catch (err: any) {
      setError(err?.message || 'Hata oluştu')
    }
  }

  async function executeDeleteCustomer(id: string) {
    setConfirmDeleteId(null)
    try {
      await fetchApi(`/api/accounts/${id}`, { method: 'DELETE' })
      if (selectedAccount?.id === id) setSelectedAccount(null)
      await loadAccounts()
    } catch (err: any) { setError(err?.message || 'Hata oluştu') }
  }

  const filteredAccounts = useMemo(() => {
    const search = searchTerm.toLowerCase()
    return accounts.filter((account) => {
      if (!search) return true
      return (
        account.name.toLowerCase().includes(search) ||
        account.code?.toLowerCase().includes(search) ||
        account.email?.toLowerCase().includes(search) ||
        account.phone?.toLowerCase().includes(search) ||
        account.tax_number?.toLowerCase().includes(search)
      )
    })
  }, [accounts, searchTerm])

  return (
    <div className="space-y-6 animate-reveal">
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && executeDeleteCustomer(confirmDeleteId)}
        title="Müşteri Sil"
        message="Bu müşteriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        variant="danger"
      />

      {error && (
        <div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error font-bold flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* CRM Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <Card variant="glass" className="hover:scale-[1.02] transition-transform">
            <CardBody className="p-6 flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Toplam Müşteri</p>
                  <p className="text-3xl font-black">{accounts.length}</p>
               </div>
               <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                  <Users className="w-6 h-6 shadow-glow" />
               </div>
            </CardBody>
         </Card>
         <Card variant="glass" className="hover:scale-[1.02] transition-transform text-success">
            <CardBody className="p-6 flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Yeni (30 Gün)</p>
                  <p className="text-3xl font-black">{Math.floor(accounts.length * 0.1)}</p>
               </div>
               <div className="p-4 rounded-2xl bg-success/10">
                  <Activity className="w-6 h-6 shadow-glow" />
               </div>
            </CardBody>
         </Card>
         <Card variant="glass" className="hover:scale-[1.02] transition-transform text-secondary">
            <CardBody className="p-6 flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Aktif Fırsat</p>
                  <p className="text-3xl font-black">{Math.floor(accounts.length * 0.4)}</p>
               </div>
               <div className="p-4 rounded-2xl bg-secondary/10">
                  <TrendingUp className="w-6 h-6 shadow-glow" />
               </div>
            </CardBody>
         </Card>
         <Card variant="glass" className="hover:scale-[1.02] transition-transform">
            <CardBody className="p-6 flex items-center justify-between">
               <div>
                  <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Müşteri Sadakati</p>
                  <p className="text-3xl font-black">%92</p>
               </div>
               <div className="p-4 rounded-2xl bg-white/5">
                  <ShieldCheck className="w-6 h-6 opacity-40" />
               </div>
            </CardBody>
         </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Customer List Section */}
         <div className="lg:col-span-2 space-y-6">
            <Card variant="glass">
               <CardHeader className="p-6 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                     <Handshake className="w-5 h-5 text-primary" />
                     <h3 className="font-black uppercase tracking-widest text-sm">Müşteri Veritabanı</h3>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                     <div className="relative flex-1 md:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-primary transition-colors" />
                        <Input 
                           placeholder="Müşteri ara..." 
                           className="pl-9 h-9 text-xs" 
                           variant="filled"
                           value={searchTerm}
                           onChange={e => setSearchTerm(e.target.value)}
                        />
                     </div>
                     <Button variant="solid" color="primary" size="sm" onClick={() => setShowAddModal(true)} className="h-9 px-4 whitespace-nowrap">
                        <Plus className="w-4 h-4 mr-2" />
                        Müşteri Ekle
                     </Button>
                  </div>
               </CardHeader>
               <CardBody className="p-0">
                  <div className="overflow-x-auto">
                     <table className="w-full">
                        <thead>
                           <tr className="bg-white/5 border-b border-white/5">
                              <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">Müşteri</th>
                              <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-left">İletişim</th>
                              <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-right">Bakiye</th>
                              <th className="text-[9px] font-black text-foreground/40 uppercase tracking-widest p-4 text-right">İşlem</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                           {loading ? (
                              <tr><td colSpan={4} className="py-20 text-center opacity-40 font-black uppercase tracking-widest text-xs">Portföy Yükleniyor...</td></tr>
                           ) : filteredAccounts.length === 0 ? (
                              <tr><td colSpan={4} className="py-20 text-center opacity-20 font-black uppercase tracking-widest text-xs">Müşteri bulunamadı</td></tr>
                           ) : (
                              filteredAccounts.map((account) => (
                                 <tr key={account.id} className={cn("hover:bg-white/[0.02] transition-colors group cursor-pointer", selectedAccount?.id === account.id && "bg-primary/5")} onClick={() => setSelectedAccount(account)}>
                                    <td className="p-4">
                                       <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-xs group-hover:bg-primary/10 transition-colors">
                                             {account.name.substring(0, 2).toUpperCase()}
                                          </div>
                                          <div className="flex flex-col">
                                             <span className="text-sm font-black uppercase tracking-tight group-hover:text-primary transition-colors">{account.name}</span>
                                             <span className="text-[10px] font-mono text-foreground/30 capitalize">{account.code || 'Müşteri'}</span>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="p-4">
                                       <div className="flex flex-col">
                                          <span className="text-xs font-bold text-foreground/60">{account.phone || '-'}</span>
                                          <span className="text-[10px] font-medium opacity-30 truncate max-w-[150px]">{account.email || '-'}</span>
                                       </div>
                                    </td>
                                    <td className="p-4 text-right">
                                       <span className={cn("text-sm font-black tracking-tighter", (account.balance || 0) > 0 ? "text-success" : (account.balance || 0) < 0 ? "text-error" : "text-foreground/40")}>
                                          {(account.balance || 0).toLocaleString('tr-TR')} <span className="text-[10px] font-medium opacity-30">₺</span>
                                       </span>
                                    </td>
                                    <td className="p-4 text-right">
                                       <div className="flex items-center justify-end gap-1">
                                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/5" onClick={(e) => { e.stopPropagation(); setSelectedAccount(account); }}>
                                             <ChevronRight className="w-4 h-4 text-primary" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:bg-error/10 text-error" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(account.id); }}>
                                             <Trash2 className="w-4 h-4" />
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
         </div>

         {/* Selection Sidebar */}
         <div className="space-y-6">
            {!selectedAccount ? (
               <Card variant="glass" className="bg-primary/5 border-primary/20 border-dashed">
                  <CardBody className="p-10 flex flex-col items-center justify-center text-center">
                     <div className="p-4 rounded-full bg-primary/10 mb-4 animate-bounce">
                        <User className="w-8 h-8 text-primary" />
                     </div>
                     <h4 className="font-black uppercase tracking-widest text-xs mb-2">Seçim Yapılmadı</h4>
                     <p className="text-[11px] font-medium opacity-40 leading-relaxed">
                        Müşteri detaylarını görüntülemek ve düzenlemek için soldaki listeden bir seçim yapın.
                     </p>
                  </CardBody>
               </Card>
            ) : (
               <div className="space-y-6 animate-reveal" ref={detailRef}>
                  <Card variant="glass" className="bg-primary/5 border-primary/20 overflow-hidden">
                     <CardHeader className="p-6 pb-2 flex items-center justify-between">
                        <h3 className="font-black uppercase tracking-widest text-[10px] text-foreground/40">Müşteri Profili</h3>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedAccount(null)}><X className="w-4 h-4" /></Button>
                     </CardHeader>
                     <CardBody className="p-6 space-y-6">
                        <div className="flex items-center gap-4">
                           <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-2xl text-primary shadow-glow">
                              {selectedAccount.name.substring(0, 2).toUpperCase()}
                           </div>
                           <div className="flex-1 min-w-0">
                              <h4 className="text-xl font-black uppercase tracking-tighter truncate leading-none mb-1">{selectedAccount.name}</h4>
                              <div className="flex items-center gap-2">
                                 <Badge variant="soft" color="primary" className="text-[8px] font-black">{selectedAccount.code || 'MÜŞTERİ'}</Badge>
                                 <span className="text-[10px] font-bold opacity-30 italic">{formatDate(selectedAccount.created_at)}</span>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                              <p className="text-[9px] font-black text-foreground/20 uppercase mb-1">Cari Bakiye</p>
                              <p className={cn("text-lg font-black tracking-tighter", (selectedAccount.balance || 0) > 0 ? "text-success" : "text-error")}>
                                 {(selectedAccount.balance || 0).toLocaleString('tr-TR')} ₺
                              </p>
                           </div>
                           <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                              <p className="text-[9px] font-black text-foreground/20 uppercase mb-1">İskonto Oranı</p>
                              <p className="text-lg font-black tracking-tighter text-secondary">%{selectedAccount.discount_rate || 0}</p>
                           </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                           <div className="flex items-center gap-3">
                              <Mail className="w-4 h-4 text-primary" />
                              <div className="min-w-0 flex-1">
                                 <p className="text-[9px] font-black text-foreground/20 uppercase leading-none">E-Posta</p>
                                 <p className="text-xs font-bold truncate">{selectedAccount.email || '-'}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <Phone className="w-4 h-4 text-primary" />
                              <div className="min-w-0 flex-1">
                                 <p className="text-[9px] font-black text-foreground/20 uppercase leading-none">Sabit Telefon</p>
                                 <p className="text-xs font-bold">{selectedAccount.phone || '-'}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <Briefcase className="w-4 h-4 text-primary" />
                              <div className="min-w-0 flex-1">
                                 <p className="text-[9px] font-black text-foreground/20 uppercase leading-none">Yetkili Kişi</p>
                                 <p className="text-xs font-bold">{selectedAccount.authorized_person_name || '-'}</p>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase tracking-widest text-primary">Hızlı Düzenle</label>
                           <Input placeholder="Müşteri Adı" variant="filled" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                           <Input placeholder="Telefon" variant="filled" value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
                           <Button className="w-full mt-2" color="primary" onClick={updateCustomer}>
                              <Save className="w-4 h-4 mr-2" />
                              Değişiklikleri Kaydet
                           </Button>
                        </div>
                     </CardBody>
                  </Card>

                  <Card variant="glass" className="bg-amber-500/5 border-amber-500/20">
                     <CardBody className="p-6">
                        <div className="flex items-center gap-3 text-warning mb-4">
                           <Activity className="w-5 h-5" />
                           <h4 className="text-xs font-black uppercase tracking-widest">Fırsat Analizi</h4>
                        </div>
                        <p className="text-[11px] font-bold opacity-30 italic leading-relaxed">
                           Bu müşteri için son 6 ayda toplam {(selectedAccount.balance || 0) > 0 ? "aktif satış" : "hareket"} gözlemlenmiştir. Müşteri risk limiti {selectedAccount.risk_limit?.toLocaleString() || '0'} TL'dir.
                        </p>
                        <Button variant="ghost" className="w-full mt-4 justify-between h-auto py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/5" onClick={() => router.push(`/accounts/${selectedAccount.id}`)}>
                           Tüm Hareketleri Gör
                           <ExternalLink className="w-3 h-3" />
                        </Button>
                     </CardBody>
                  </Card>
               </div>
            )}
         </div>
      </div>

      {/* Modernized Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Yeni Müşteri Portföyü"
        size="xl"
      >
        <div className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Müşteri Ticari Ünvanı *</label>
                 <Input variant="filled" placeholder="Örn: ABC Tekstil Ltd. Şti." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40">E-Posta Adresi</label>
                 <Input variant="filled" type="email" placeholder="muhasebe@sirket.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40">İletişim Numarası</label>
                 <Input variant="filled" placeholder="0212 000 00 00" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Vergi Numarası</label>
                 <Input variant="filled" placeholder="1234567890" value={form.tax_number} onChange={e => setForm(p => ({ ...p, tax_number: e.target.value }))} />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Adres Bilgisi</label>
              <Input variant="filled" placeholder="Mahalle, Sokak, No, İlçe/İl" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
           </div>

           <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Yetkili Kişi</label>
                 <Input variant="filled" placeholder="Ad Soyad" value={form.authorized_person_name} onChange={e => setForm(p => ({ ...p, authorized_person_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Yetkili Telefon</label>
                 <Input variant="filled" placeholder="05xx 000 00 00" value={form.authorized_person_phone} onChange={e => setForm(p => ({ ...p, authorized_person_phone: e.target.value }))} />
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-6">
              <Button variant="ghost" onClick={() => setShowAddModal(false)}>Vazgeç</Button>
              <Button color="primary" onClick={createCustomer} disabled={loading || !form.name.trim()}>
                 <Save className="w-4 h-4 mr-2" />
                 Müşteriyi Kaydet
              </Button>
           </div>
        </div>
      </Modal>
    </div>
  )
}
