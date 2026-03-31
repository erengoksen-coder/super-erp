'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users as UsersIcon, 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Shield, 
  Circle, 
  KeyRound,
  ShieldCheck,
  Activity,
  AlertCircle,
  MoreHorizontal,
  Lock,
  Globe,
  Monitor,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Plus,
  ArrowRight,
  Search,
  Settings as SettingsIcon,
  Fingerprint,
  UserCheck,
  Zap,
  RefreshCw
} from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/lib/store/authStore'
import { isAdminRole } from '@/lib/auth/permissions-check'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime } from '@/lib/utils/dateFormat'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/cn'

interface User {
  id: string
  username: string
  email?: string
  full_name?: string
  role: string
  position?: string
  job_title?: string
  is_approved: number
  is_locked?: number
  approved_by?: string
  approved_at?: string
  created_at: string
  last_login?: string
  is_online?: boolean
  dealer_name?: string | null
  permissions?: Array<{
    page_path: string
    can_view: number
    can_create: number
    can_edit: number
    can_delete: number
  }>
}

interface PageOption {
  path: string
  name: string
  category: string
}

const AVAILABLE_PAGES: PageOption[] = [
  { path: '/', name: 'Kontrol Paneli', category: 'Ana' },
  { path: '/inventory', name: 'Stok Yönetimi', category: 'Stok' },
  { path: '/inventory/materials', name: 'Hammadde Depo', category: 'Stok' },
  { path: '/inventory/materials/price-history', name: 'Hammadde Fiyat Geçmişi', category: 'Stok' },
  { path: '/inventory/materials/reservations', name: 'Hammadde Rezervasyon', category: 'Stok' },
  { path: '/inventory/products', name: 'Mamül Depo', category: 'Stok' },
  { path: '/production', name: 'Üretim Emirleri', category: 'Üretim' },
  { path: '/production/calendar', name: 'Üretim Takvimi', category: 'Üretim' },
  { path: '/production/work-orders', name: 'İş Emirleri', category: 'Üretim' },
  { path: '/production/operations', name: 'Operasyonlar', category: 'Üretim' },
  { path: '/production/work-centers', name: 'İş Merkezleri', category: 'Üretim' },
  { path: '/production/order-operations', name: 'Üretim Operasyonları', category: 'Üretim' },
  { path: '/production/mrp', name: 'MRP', category: 'Üretim' },
  { path: '/production/new', name: 'Yeni Üretim', category: 'Üretim' },
  { path: '/inventory/products/print-barcode-label', name: 'Etiket / Barkod', category: 'Stok' },
  { path: '/api-catalog', name: 'API Katalogu', category: 'Sistem' },
  { path: '/orders', name: 'Siparişler', category: 'Satış' },
  { path: '/sales-orders', name: 'Satış Siparişleri', category: 'Satış' },
  { path: '/shipments', name: 'Sevkiyat', category: 'Sevkiyat' },
  { path: '/invoices', name: 'Faturalar', category: 'Satış' },
  { path: '/invoices/new', name: 'Yeni Fatura', category: 'Satış' },
  { path: '/reports', name: 'Raporlar', category: 'Rapor' },
  { path: '/reports/costs', name: 'Üretim Maliyet Raporu', category: 'Rapor' },
  { path: '/reports/fire', name: 'Fire Analizi', category: 'Rapor' },
  { path: '/finance', name: 'Finans', category: 'Finans' },
  { path: '/finance/journal-entries', name: 'Yevmiye Fişleri', category: 'Finans' },
  { path: '/finance/new', name: 'Yeni Fiş', category: 'Finans' },
  { path: '/finance/chart-of-accounts', name: 'Hesap Planı', category: 'Finans' },
  { path: '/finance/general-ledger', name: 'Büyük Defter', category: 'Finans' },
  { path: '/finance/fire-analysis', name: 'Fire / Maliyet', category: 'Finans' },
  { path: '/accounting', name: 'Muhasebe', category: 'Finans' },
  { path: '/notifications', name: 'Bildirimler', category: 'Sistem' },
  { path: '/accounts', name: 'Cari Hesaplar', category: 'Finans' },
  { path: '/payments', name: 'Ödemeler', category: 'Finans' },
  { path: '/barcodes', name: 'Barkod Yönetimi', category: 'Stok' },
  { path: '/purchase/critical-stock', name: 'Kritik Stok', category: 'Stok' },
  { path: '/purchase-requests', name: 'Satın Alma Talepleri', category: 'Satın Alma' },
  { path: '/purchase-orders', name: 'Satın Alma Siparişleri', category: 'Satın Alma' },
  { path: '/procurement', name: 'Tedarik', category: 'Satın Alma' },
  { path: '/mobile/material-stock', name: 'Depo Hızlı İşlem', category: 'Mobil' },
  { path: '/mobile/workstation', name: 'Usta Terminali', category: 'Mobil' },
  { path: '/bom', name: 'Ürün Reçetesi', category: 'Üretim' },
  { path: '/units/conversions', name: 'Birim Çevrimleri', category: 'Stok' },
  { path: '/settings', name: 'Ayarlar', category: 'Sistem' },
  { path: '/users', name: 'Kullanıcı Yönetimi', category: 'Sistem' },
  { path: '/bayi', name: 'Bayi Portal (Yeni Sipariş Girme)', category: 'Bayi' },
  { path: '/hr', name: 'İnsan Kaynakları', category: 'İK' },
  { path: '/crm', name: 'CRM', category: 'Satış' },
  { path: '/fixed-assets', name: 'Sabit Kıymet', category: 'Finans' },
]

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    job_title: '',
    role: 'user',
    position: '',
    dealer_name: '',
    is_approved: false,
    is_locked: false,
  })
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, {
    can_view: boolean
    can_create: boolean
    can_edit: boolean
    can_delete: boolean
  }>>({})
  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(null)
  const [userListTab, setUserListTab] = useState<'all' | 'bayiler'>('all')
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
  const [resetPasswordInput, setResetPasswordInput] = useState('')
  const currentUserId = useAuthStore((state) => state.user?.id ?? null)
  const user = useAuthStore((state) => state.user)
  const router = useRouter()

  const displayedUsers = useMemo(() => {
     let list = userListTab === 'bayiler'
       ? users.filter((u) => (u.role || '').toString().trim().toLowerCase() === 'bayi')
       : users.filter((u) => (u.role || '').toString().trim().toLowerCase() !== 'bayi')
     
     if (searchTerm) {
        const s = searchTerm.toLowerCase()
        list = list.filter(u => 
           u.username.toLowerCase().includes(s) || 
           u.full_name?.toLowerCase().includes(s) || 
           u.email?.toLowerCase().includes(s) ||
           u.job_title?.toLowerCase().includes(s)
        )
     }
     return list
  }, [users, userListTab, searchTerm])

  const isStrictAdmin = (user?.role ?? '').toString().trim().toLowerCase() === 'admin'

  useEffect(() => {
    if (user === undefined) return
    if (user === null) return
    if (!isAdminRole(user.role)) {
      router.replace('/')
      return
    }
  }, [user, router])

  useEffect(() => {
    if (!user || !isAdminRole(user.role)) return
    loadUsers()
  }, [user?.id])

  useEffect(() => {
    if (!user || !isAdminRole(user.role)) return
    const t = setInterval(() => {
      if (!showAddForm && !editingUserId) loadUsers()
    }, 60 * 1000)
    return () => clearInterval(t)
  }, [user?.id, showAddForm, editingUserId])

  useEffect(() => {
    if (formData.role === 'admin' || formData.role === 'yönetici') {
      const allPermissions: Record<string, any> = {}
      AVAILABLE_PAGES.forEach(page => {
        allPermissions[page.path] = { can_view: true, can_create: true, can_edit: true, can_delete: true }
      })
      setSelectedPermissions(allPermissions)
    } else if (formData.role === 'bayi') {
      setFormData((prev) => ({ ...prev, position: 'bayi' }))
      setSelectedPermissions({ '/bayi': { can_view: true, can_create: true, can_edit: true, can_delete: false } })
    }
  }, [formData.role])

  async function loadUsers() {
    try {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Yüklenemedi')
      const data = await response.json()
      const list = Array.isArray(data) ? data : (data?.users ?? [])
      setUsers(list)
    } catch (error) {
      toast.error('Kullanıcı listesi alınamadı')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(u: User) {
    setEditingUserId(u.id)
    setFormData({
      username: u.username,
      email: u.email || '',
      password: '',
      full_name: u.full_name || '',
      job_title: u.job_title || '',
      role: u.role,
      position: (u as any).position || '',
      dealer_name: (u as any).dealer_name || '',
      is_approved: u.is_approved === 1,
      is_locked: (u as any).is_locked === 1,
    })

    const perms: Record<string, any> = {}
    if (u.permissions) {
      u.permissions.forEach(p => {
        perms[p.page_path] = {
          can_view: p.can_view === 1,
          can_create: p.can_create === 1,
          can_edit: p.can_edit === 1,
          can_delete: p.can_delete === 1,
        }
      })
    }
    setSelectedPermissions(perms)
    setShowAddForm(true)
  }

  function cancelEdit() {
    setEditingUserId(null)
    setFormData({
      username: '', email: '', password: '', full_name: '', job_title: '',
      role: 'user', position: '', dealer_name: '', is_approved: false, is_locked: false,
    })
    setSelectedPermissions({})
    setShowAddForm(false)
  }

  async function handleSave() {
    try {
      const userId = editingUserId
      const payload: any = {
        ...formData,
        permissions: Object.entries(selectedPermissions).map(([path, perms]) => ({
          page_path: path,
          ...perms,
        })),
      }
      if (userId) {
        if (!formData.password) delete payload.password
        const response = await fetch(`/api/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error('Güncellenemedi')
        toast.success('Başarıyla güncellendi')
      } else {
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) throw new Error('Oluşturulamadı')
        toast.success('Başarıyla oluşturuldu')
      }
      cancelEdit()
      loadUsers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  async function executeDelete(userId: string) {
    setConfirmDeleteId(null)
    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Silinemedi')
      toast.success('Kullanıcı silindi')
      loadUsers()
    } catch (error: any) { toast.error(error.message) }
  }

  async function executeResetPassword() {
    if (!resetPasswordUser) return
    const trimmed = resetPasswordInput.trim()
    if (trimmed.length < 6) return toast.error('Min 6 karakter')
    setResettingPasswordId(resetPasswordUser.id)
    try {
      const response = await fetch(`/api/users/${resetPasswordUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed }),
      })
      if (!response.ok) throw new Error('Hata')
      toast.success('Şifre güncellendi')
    } catch (error: any) { toast.error('Sıfırlanamadı') }
    finally { setResettingPasswordId(null); setResetPasswordUser(null) }
  }

  function handleResetPassword(u: User) {
    setResetPasswordUser(u)
    setResetPasswordInput('')
  }

  function togglePermission(pagePath: string, permission: 'can_view' | 'can_create' | 'can_edit' | 'can_delete') {
    setSelectedPermissions(prev => ({
      ...prev,
      [pagePath]: {
        ...prev[pagePath],
        [permission]: !prev[pagePath]?.[permission],
        can_view: permission === 'can_view' ? !prev[pagePath]?.[permission] : (prev[pagePath]?.can_view || false),
      },
    }))
  }

  const groupedPages = useMemo(() => AVAILABLE_PAGES.reduce((acc, page) => {
    if (!acc[page.category]) acc[page.category] = []
    acc[page.category].push(page)
    return acc
  }, {} as Record<string, PageOption[]>), [])

  if (user && !isAdminRole(user.role)) return null

  return (
    <AppDashboardLayout
      title="Kullanıcı Hakları & Yönetimi"
      subtitle="Sistem erişim yetkileri ve personel hesapları"
      icon={Fingerprint}
      actions={
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" onClick={() => loadUsers()}>
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Tazele
           </Button>
           <Button variant="solid" color="primary" size="sm" onClick={() => { cancelEdit(); setShowAddForm(true); }}>
              <UserPlus className="w-4 h-4 mr-2" />
              Yeni Kullanıcı
           </Button>
        </div>
      }
    >
      <div className="space-y-6 animate-reveal">
         <ConfirmDialog isOpen={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} onConfirm={() => confirmDeleteId && executeDelete(confirmDeleteId)} title="Kullanıcıyı Sil" message="Bu hesabı kalıcı olarak silmek istediğinize emin misiniz?" variant="danger" />
         
         <Modal isOpen={!!resetPasswordUser} onClose={() => setResetPasswordUser(null)} title="Güvenli Şifre Sıfırlama">
            <div className="space-y-6 py-4">
               <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4 text-warning">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <p className="text-[11px] font-bold leading-relaxed italic uppercase">Dikkat: Yeni şifre bir kez görüntülenebilir. Lütfen kullanıcıya iletmeyi unutmayın.</p>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Yeni Şifre (Min 6 Karakter)</label>
                  <Input variant="filled" className="font-mono text-center tracking-widest text-lg h-14" placeholder="••••••••" value={resetPasswordInput} onChange={e => setResetPasswordInput(e.target.value)} autoFocus />
               </div>
               <div className="flex gap-3 pt-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setResetPasswordUser(null)}>İPTAL</Button>
                  <Button color="primary" className="flex-1" onClick={executeResetPassword} disabled={resetPasswordInput.trim().length < 6}>ŞİFREYİ UYGULA</Button>
               </div>
            </div>
         </Modal>

         {/* KPI Row */}
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card variant="glass" className="hover:scale-[1.02] transition-transform">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Toplam Hesap</p>
                     <p className="text-3xl font-black">{users.length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                     <UsersIcon className="w-6 h-6 shadow-glow" />
                  </div>
               </CardBody>
            </Card>
            <Card variant="glass" className="hover:scale-[1.02] transition-transform text-success">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Çevrimiçi</p>
                     <p className="text-3xl font-black">{users.filter(u => u.is_online).length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-success/10">
                     <Circle className="w-6 h-6 fill-current shadow-glow" />
                  </div>
               </CardBody>
            </Card>
            <Card variant="glass" className="hover:scale-[1.02] transition-transform text-warning">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Onay Bekleyen</p>
                     <p className="text-3xl font-black">{users.filter(u => !u.is_approved).length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-warning/10">
                     <Activity className="w-6 h-6 shadow-glow" />
                  </div>
               </CardBody>
            </Card>
            <Card variant="glass" className="hover:scale-[1.02] transition-transform text-error">
               <CardBody className="p-6 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest mb-1">Kilitli Hesap</p>
                     <p className="text-3xl font-black">{users.filter(u => u.is_locked).length}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-error/10">
                     <Lock className="w-6 h-6 shadow-glow" />
                  </div>
               </CardBody>
            </Card>
         </div>

         {/* Main Section */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={cn("lg:col-span-2 space-y-6 transition-all", (showAddForm || editingUserId) && "lg:col-span-1")}>
               <Card variant="glass">
                  <CardHeader className="p-6 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                     <div className="flex items-center gap-3">
                        <UserCheck className="w-5 h-5 text-primary" />
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                           <button onClick={() => setUserListTab('all')} className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all", userListTab === 'all' ? "bg-primary text-white shadow-glow-sm" : "text-foreground/40 hover:text-foreground/60")}>SİSTEM</button>
                           <button onClick={() => setUserListTab('bayiler')} className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all", userListTab === 'bayiler' ? "bg-emerald-600 text-white shadow-glow-sm" : "text-foreground/40 hover:text-foreground/60")}>BAYİLER</button>
                        </div>
                     </div>
                     <div className="relative w-full md:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/20 group-focus-within:text-primary transition-colors" />
                        <Input variant="filled" placeholder="Ara..." className="pl-9 h-9 text-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                     </div>
                  </CardHeader>
                  <CardBody className="p-0">
                     <div className="overflow-x-auto overflow-y-auto max-h-[1000px] custom-scrollbar">
                        <table className="w-full">
                           <thead>
                              <tr className="bg-white/5 border-b border-white/5 text-[9px] font-black text-foreground/40 uppercase tracking-widest">
                                 <th className="p-4 text-left">Kullanıcı / Personel</th>
                                 <th className="p-4 text-left">Yetki Seviyesi</th>
                                 {userListTab === 'all' && <th className="p-4 text-left">Durum</th>}
                                 <th className="p-4 text-right">İşlemler</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                              {loading ? (
                                 <tr><td colSpan={4} className="py-20 text-center opacity-40 font-black tracking-widest text-xs">Yükleniyor...</td></tr>
                              ) : displayedUsers.length === 0 ? (
                                 <tr><td colSpan={4} className="py-20 text-center opacity-20 font-black tracking-widest text-xs">Sonuç bulunamadı</td></tr>
                              ) : (
                                 displayedUsers.map((u) => (
                                    <tr key={u.id} className={cn("hover:bg-white/[0.02] transition-colors group", editingUserId === u.id && "bg-primary/5")}>
                                       <td className="p-4">
                                          <div className="flex items-center gap-3">
                                             <div className="relative">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black group-hover:bg-primary/10 transition-colors">
                                                   {u.username.substring(0, 2).toUpperCase()}
                                                </div>
                                                {u.is_online && <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-[#09090b] shadow-glow-sm shadow-success/40" />}
                                             </div>
                                             <div className="flex flex-col">
                                                <span className="text-sm font-black uppercase tracking-tight group-hover:text-primary transition-colors">{u.full_name || u.username}</span>
                                                <span className="text-[10px] font-mono opacity-30 font-bold">{u.email || `@${u.username}`}</span>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <div className="flex flex-col gap-1.5">
                                             <Badge variant="soft" color={u.role === 'admin' ? 'error' : u.role === 'bayi' ? 'success' : 'primary'} className="text-[8px] font-black w-fit px-3">
                                                {u.role.toUpperCase()}
                                             </Badge>
                                             <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-tighter truncate max-w-[120px]">{u.job_title || '-'}</span>
                                          </div>
                                       </td>
                                       {userListTab === 'all' && (
                                          <td className="p-4">
                                             <div className="flex flex-col gap-1">
                                                {u.is_approved ? <Badge variant="glass" className="text-[7px] w-fit text-success border-success/20">ONAYLI</Badge> : <Badge variant="glass" className="text-[7px] w-fit text-warning border-warning/20">BEKLEMEDE</Badge>}
                                                {u.is_locked ? <Badge variant="glass" className="text-[7px] w-fit text-error border-error/20">KİLİTLİ</Badge> : null}
                                             </div>
                                          </td>
                                       )}
                                       <td className="p-4 text-right">
                                          <div className="flex items-center justify-end gap-1">
                                             {isStrictAdmin && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-warning opacity-0 group-hover:opacity-100 transition-all hover:bg-warning/10" onClick={() => handleResetPassword(u)} title="Taze Şifre">
                                                   <KeyRound className="w-4 h-4" />
                                                </Button>
                                             )}
                                             <Button variant="ghost" size="icon" className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10" onClick={() => startEdit(u)} title="Düzenle">
                                                <Edit className="w-4 h-4" />
                                             </Button>
                                             {u.role !== 'admin' && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-error opacity-0 group-hover:opacity-100 transition-all hover:bg-error/10" onClick={() => setConfirmDeleteId(u.id)} title="Sil">
                                                   <Trash2 className="w-4 h-4" />
                                                </Button>
                                             )}
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

            {/* Form Section */}
            {(showAddForm || editingUserId) && (
               <div className="lg:col-span-2 space-y-6 animate-reveal">
                  <Card variant="glass" className="border-primary/20 bg-primary/5">
                     <CardHeader className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <ShieldCheck className="w-5 h-5 text-primary" />
                           <h3 className="font-black uppercase tracking-widest text-sm">{editingUserId ? 'HESAP REVİZYONU' : 'YENİ HESAP TANIMLAMA'}</h3>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => cancelEdit()}><X className="w-4 h-4" /></Button>
                     </CardHeader>
                     <CardBody className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Kullanıcı Adı *</label>
                              <Input variant="filled" value={formData.username} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">E-Posta Adresi</label>
                              <Input variant="filled" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Ad Soyad</label>
                              <Input variant="filled" value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Görev / Ünvan</label>
                              <Input variant="filled" value={formData.job_title} onChange={e => setFormData(p => ({ ...p, job_title: e.target.value }))} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Sistem Rolü</label>
                              <select className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer" value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}>
                                 <option value="user">USER</option>
                                 <option value="admin">ADMIN</option>
                                 <option value="yönetici">YÖNETİCİ</option>
                                 <option value="bayi">BAYİ</option>
                              </select>
                           </div>
                           {!editingUserId && (
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Giriş Şifresi *</label>
                                 <Input variant="filled" type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} />
                              </div>
                           )}
                        </div>

                        {/* Permission Grid - Platinum */}
                        <div className="space-y-4 pt-8 border-t border-white/5">
                           <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Sayfa Bazlı Yetkilendirme</h4>
                              <div className="flex gap-2">
                                 <Button variant="soft" color="primary" size="xs" onClick={() => {
                                    const all: any = {}
                                    AVAILABLE_PAGES.forEach(p => all[p.path] = { can_view: true, can_create: true, can_edit: true, can_delete: true })
                                    setSelectedPermissions(all)
                                 }}>TÜMÜNÜ AÇ</Button>
                                 <Button variant="soft" color="error" size="xs" onClick={() => setSelectedPermissions({})}>SIFIRLA</Button>
                              </div>
                           </div>
                           
                           <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                              {Object.entries(groupedPages).map(([category, pages]) => (
                                 <div key={category} className="p-4 bg-white/5 rounded-3xl border border-white/5">
                                    <p className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em] mb-3">{category}</p>
                                    <div className="space-y-2">
                                       {pages.map((p) => (
                                          <div key={p.path} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                                             <span className="text-xs font-bold text-foreground/80">{p.name}</span>
                                             <div className="flex items-center gap-3">
                                                {['can_view', 'can_create', 'can_edit', 'can_delete'].map((action) => (
                                                   <button key={action} onClick={() => togglePermission(p.path, action as any)} className={cn("w-6 h-6 rounded-lg flex items-center justify-center border transition-all", selectedPermissions[p.path]?.[action as keyof typeof selectedPermissions[string]] ? "bg-primary text-white border-primary shadow-glow-sm" : "bg-white/5 border-white/10 text-transparent")}>
                                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                                   </button>
                                                ))}
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 pt-6 border-t border-white/5">
                           <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 transition-colors">
                              <input type="checkbox" checked={formData.is_approved} onChange={e => setFormData(p => ({ ...p, is_approved: e.target.checked }))} className="w-5 h-5 rounded-lg bg-white/5 border-white/20 text-success focus:ring-success/50" />
                              <div>
                                 <p className="text-[10px] font-black uppercase text-foreground/60 leading-none">Hemen Onayla</p>
                                 <p className="text-[9px] font-medium opacity-20 mt-1 italic uppercase">Hesap aktif edilsin</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10 transition-colors">
                              <input type="checkbox" checked={formData.is_locked} onChange={e => setFormData(p => ({ ...p, is_locked: e.target.checked }))} className="w-5 h-5 rounded-lg bg-white/5 border-white/20 text-error focus:ring-error/50" />
                              <div>
                                 <p className="text-[10px] font-black uppercase text-foreground/60 leading-none">Hesabı Kilitle</p>
                                 <p className="text-[9px] font-medium opacity-20 mt-1 italic uppercase">Erişim engellensin</p>
                              </div>
                           </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6">
                           <Button variant="ghost" onClick={() => cancelEdit()}>VAZGEÇ</Button>
                           <Button color="primary" onClick={handleSave}>
                              <Save className="w-4 h-4 mr-2" />
                              {editingUserId ? 'GÜNCELLEMELERİ KAYDET' : 'KULLANICIYI OLUŞTUR'}
                           </Button>
                        </div>
                     </CardBody>
                  </Card>
               </div>
            )}
         </div>
      </div>
    </AppDashboardLayout>
  )
}
