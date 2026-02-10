'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, UserPlus, CheckCircle, XCircle, Edit, Trash2, Save, X, Shield, Circle, KeyRound } from 'lucide-react'
import { LogoWithBackground } from '@/components/Logo'
import { useAuthStore } from '@/lib/store/authStore'
import { isAdminRole } from '@/lib/auth/permissions-check'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime } from '@/lib/utils/dateFormat'

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
  const currentUserId = useAuthStore((state) => state.user?.id ?? null)
  const user = useAuthStore((state) => state.user)
  const router = useRouter()

  const displayedUsers = userListTab === 'bayiler'
    ? users.filter((u) => (u.role || '').toString().trim().toLowerCase() === 'bayi')
    : users.filter((u) => (u.role || '').toString().trim().toLowerCase() !== 'bayi')

  // Sadece admin rolü (yönetici değil) kullanıcı şifrelerini görebilir / sıfırlayabilir
  const isStrictAdmin = (user?.role ?? '').toString().trim().toLowerCase() === 'admin'

  // Sadece admin/yönetici kullanıcılar sayfayı görebilir
  useEffect(() => {
    if (user === undefined) return
    if (user === null) return
    if (!isAdminRole(user.role)) {
      router.replace('/')
      return
    }
  }, [user, router])

  const userId = user?.id
  useEffect(() => {
    if (!user || !isAdminRole(user.role)) return
    loadUsers()
  }, [userId])

  // Çevrimiçi durumu güncel kalsın: 1 dakikada bir listeyi yenile (form açıkken yenileme yapma, sayfa başa dönmesin)
  useEffect(() => {
    if (!user || !isAdminRole(user.role)) return
    const t = setInterval(() => {
      if (!showAddForm && !editingUserId) loadUsers()
    }, 60 * 1000)
    return () => clearInterval(t)
  }, [userId, showAddForm, editingUserId])

  // Rol değiştiğinde yönetici ise tüm izinleri otomatik aktif et; Bayi ise sadece Bayi portalı (gör + yeni sipariş + düzenle, silme yok)
  useEffect(() => {
    if (formData.role === 'yönetici' || formData.role === 'yonetici' || formData.role === 'admin') {
      const allPermissions: Record<string, {
        can_view: boolean
        can_create: boolean
        can_edit: boolean
        can_delete: boolean
      }> = {}
      
      AVAILABLE_PAGES.forEach(page => {
        allPermissions[page.path] = {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
        }
      })
      
      setSelectedPermissions(allPermissions)
    } else if (formData.role === 'bayi') {
      setFormData((prev) => ({ ...prev, position: 'bayi' }))
      setSelectedPermissions({
        '/bayi': {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: false,
        },
      })
    }
  }, [formData.role])

  async function loadUsers() {
    try {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Kullanıcılar yüklenemedi')
      const data = await response.json()
      const list = Array.isArray(data) ? data : (data?.users ?? data?.data ?? [])
      setUsers(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Kullanıcılar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(user: User) {
    setEditingUserId(user.id)
    setFormData({
      username: user.username,
      email: user.email || '',
      password: '',
      full_name: user.full_name || '',
      job_title: user.job_title || '',
      role: user.role,
      position: (user as any).position || '',
      dealer_name: (user as any).dealer_name || '',
      is_approved: user.is_approved === 1,
      is_locked: (user as User).is_locked === 1,
    })

    // İzinleri yükle
    const perms: Record<string, any> = {}
    if (user.permissions) {
      user.permissions.forEach(p => {
        perms[p.page_path] = {
          can_view: p.can_view === 1,
          can_create: p.can_create === 1,
          can_edit: p.can_edit === 1,
          can_delete: p.can_delete === 1,
        }
      })
    }
    setSelectedPermissions(perms)
    // Sayfayı yukarı kaydır (işlem alanına)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  function cancelEdit() {
    setEditingUserId(null)
    setFormData({
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
    setSelectedPermissions({})
  }

  async function handleSave() {
    try {
      const userId = editingUserId
      if (userId) {
        // Güncelleme (şifre sadece doldurulduysa gönderilir)
        const { password, ...restForm } = formData
        const payload: Record<string, unknown> = {
          ...restForm,
          is_approved: formData.is_approved,
          is_locked: (formData as { is_locked?: boolean }).is_locked,
          approved_by: formData.is_approved && !users.find(u => u.id === userId)?.is_approved ? currentUserId : undefined,
          permissions: Object.entries(selectedPermissions).map(([path, perms]) => ({
            page_path: path,
            ...perms,
          })),
        }
        if (password && password.trim()) payload.password = password.trim()
        const response = await fetch(`/api/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Kullanıcı güncellenemedi')
        }

        toast.success('Kullanıcı başarıyla güncellendi')
      } else {
        // Yeni kullanıcı
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            permissions: Object.entries(selectedPermissions).map(([path, perms]) => ({
              page_path: path,
              ...perms,
            })),
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Kullanıcı oluşturulamadı')
        }

        toast.success('Kullanıcı başarıyla oluşturuldu')
      }

      cancelEdit()
      setShowAddForm(false)
      loadUsers()
    } catch (error: any) {
      toast.error(error.message || 'İşlem başarısız')
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
      return
    }

    // Sayfayı yukarı kaydır
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Kullanıcı silinemedi')
      }

      toast.success('Kullanıcı başarıyla silindi')
      loadUsers()
    } catch (error: any) {
      toast.error(error.message || 'Silme işlemi başarısız')
    }
  }

  async function handleResetPassword(u: User) {
    const newPassword = window.prompt(`${u.username} için yeni şifre (en az 6 karakter):`)
    if (newPassword == null) return
    const trimmed = newPassword.trim()
    if (trimmed.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır')
      return
    }
    setResettingPasswordId(u.id)
    try {
      const response = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Şifre güncellenemedi')
      }
      toast.success('Şifre güncellendi')
      toast.success(`Şifre sıfırlandı. Kullanıcı: ${u.username} — Yeni şifre: ${trimmed}. Bu şifreyi kullanıcıya iletin; bir kez gösterilir.`)
    } catch (error: any) {
      toast.error(error.message || 'Şifre sıfırlanamadı')
    } finally {
      setResettingPasswordId(null)
    }
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

  function activateAllPermissions() {
    const allPermissions: Record<string, {
      can_view: boolean
      can_create: boolean
      can_edit: boolean
      can_delete: boolean
    }> = {}
    
    AVAILABLE_PAGES.forEach(page => {
      allPermissions[page.path] = {
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
      }
    })
    
    setSelectedPermissions(allPermissions)
  }

  function activateViewAndCreateOnly() {
    const viewCreatePermissions: Record<string, {
      can_view: boolean
      can_create: boolean
      can_edit: boolean
      can_delete: boolean
    }> = {}
    
    AVAILABLE_PAGES.forEach(page => {
      viewCreatePermissions[page.path] = {
        can_view: true,
        can_create: true,
        can_edit: false,
        can_delete: false,
      }
    })
    
    setSelectedPermissions(viewCreatePermissions)
  }

  const groupedPages = AVAILABLE_PAGES.reduce((acc, page) => {
    if (!acc[page.category]) {
      acc[page.category] = []
    }
    acc[page.category].push(page)
    return acc
  }, {} as Record<string, PageOption[]>)

  if (user && !isAdminRole(user.role)) return null

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white flex items-center space-x-2">
              <Users className="w-6 h-6 md:w-8 md:h-8" />
              <span>Kullanıcı Yönetimi</span>
            </h1>
            <LogoWithBackground size="sm" />
          </div>
          <p className="text-sm text-gray-400">Kullanıcıları yönetin ve izinleri belirleyin</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            cancelEdit()
          }}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2 text-sm touch-manipulation mt-4 md:mt-0"
        >
          <UserPlus size={20} />
          <span>Yeni Kullanıcı</span>
        </button>
      </div>

      {/* Kullanıcı Ekleme/Düzenleme Formu */}
      {(showAddForm || editingUserId) && (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 md:p-6 mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>{editingUserId ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Kullanıcı Adı *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">E-posta</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Ad Soyad</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Görev/Ünvan *</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              />
            </div>
            {(isStrictAdmin || !editingUserId) && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {editingUserId ? 'Yeni Şifre (değiştirmek istemiyorsanız boş bırakın)' : 'Şifre *'}
                </label>
                <input
                  type={editingUserId ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUserId ? 'Yeni şifre girince burada görünür' : ''}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required={!editingUserId}
                  minLength={6}
                />
                {editingUserId ? (
                  <p className="mt-1 text-xs text-gray-400">
                    Mevcut şifre güvenlik nedeniyle görüntülenemez. Yeni şifre yazarsanız burada görünür; kaydedince kullanıcıya iletebilirsiniz. (Sadece admin)
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    En az 6 karakter.
                  </p>
                )}
              </div>
            )}
            {editingUserId && !isStrictAdmin && (
              <p className="text-xs text-gray-500">Şifre değiştirmek için admin rolü gerekir.</p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Rol *</label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const newRole = e.target.value
                  setFormData((prev) => ({
                    ...prev,
                    role: newRole,
                    position: newRole === 'bayi' ? 'bayi' : prev.position,
                  }))
                  
                  if (newRole === 'yönetici' || newRole === 'yonetici' || newRole === 'admin') {
                    const allPermissions: Record<string, {
                      can_view: boolean
                      can_create: boolean
                      can_edit: boolean
                      can_delete: boolean
                    }> = {}
                    AVAILABLE_PAGES.forEach(page => {
                      allPermissions[page.path] = {
                        can_view: true,
                        can_create: true,
                        can_edit: true,
                        can_delete: true,
                      }
                    })
                    setSelectedPermissions(allPermissions)
                  } else if (newRole === 'bayi') {
                    setSelectedPermissions({
                      '/bayi': {
                        can_view: true,
                        can_create: true,
                        can_edit: true,
                        can_delete: false,
                      },
                    })
                  }
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              >
                <option value="user">Kullanıcı</option>
                <option value="admin">Admin</option>
                <option value="yönetici">Yönetici</option>
                <option value="bayi">Bayi</option>
              </select>
            </div>
            {(formData.role === 'bayi') && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Cari Adı (Bayi) *</label>
                <input
                  type="text"
                  value={formData.dealer_name ?? ''}
                  onChange={(e) => setFormData({ ...formData, dealer_name: e.target.value })}
                  placeholder="Siparişlerdeki / Cari hesaplardaki cari adı ile aynı olmalı"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Pozisyon</label>
              <select
                value={formData.role === 'bayi' ? 'bayi' : formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={formData.role === 'bayi'}
              >
                {formData.role === 'bayi' ? (
                  <option value="bayi">Bayi</option>
                ) : (
                  <>
                    <option value="">Pozisyon Seçiniz</option>
                    <option value="genel_mudur">Genel Müdür</option>
                    <option value="uretim_muduru">Üretim Müdürü</option>
                    <option value="uretim_sorumlusu">Üretim Sorumlusu</option>
                    <option value="usta">Usta</option>
                    <option value="terzi">Terzi</option>
                    <option value="depo_sorumlusu">Depo Sorumlusu</option>
                    <option value="satis_sorumlusu">Satış Sorumlusu</option>
                    <option value="muhasebe">Muhasebe</option>
                    <option value="kalite_kontrol">Kalite Kontrol</option>
                    <option value="planlama">Planlama</option>
                    <option value="sevkiyat">Sevkiyat</option>
                    <option value="bayi">Bayi</option>
                  </>
                )}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_approved}
                  onChange={(e) => setFormData({ ...formData, is_approved: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Hemen Onayla</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(formData as { is_locked?: boolean }).is_locked}
                  onChange={(e) => setFormData({ ...formData, is_locked: e.target.checked })}
                  className="w-4 h-4 text-amber-600 bg-gray-800 border-gray-700 rounded focus:ring-amber-500"
                />
                <span className="text-sm text-gray-300">Hesabı kilitle</span>
              </label>
            </div>
          </div>

          {/* Sayfa İzinleri */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">Sayfa İzinleri</h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={activateAllPermissions}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition"
                >
                  Tümünü Aktif Et
                </button>
                <button
                  type="button"
                  onClick={activateViewAndCreateOnly}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
                >
                  Sil ve Düzen Haric Aktif Et
                </button>
              </div>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(groupedPages).map(([category, pages]) => (
                <div key={category} className="bg-gray-800 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase">{category}</h4>
                  <div className="space-y-2">
                    {pages.map((page) => (
                      <div key={page.path} className="flex items-center justify-between bg-gray-900 rounded p-2">
                        <span className="text-sm text-white flex-1">{page.name}</span>
                        <div className="flex items-center space-x-2">
                          <label className="flex items-center space-x-1">
                            <input
                              type="checkbox"
                              checked={selectedPermissions[page.path]?.can_view || false}
                              onChange={() => togglePermission(page.path, 'can_view')}
                              className="w-3 h-3 text-blue-600 bg-gray-800 border-gray-700 rounded"
                            />
                            <span className="text-xs text-gray-400">Gör</span>
                          </label>
                          <label className="flex items-center space-x-1">
                            <input
                              type="checkbox"
                              checked={selectedPermissions[page.path]?.can_create || false}
                              onChange={() => togglePermission(page.path, 'can_create')}
                              className="w-3 h-3 text-blue-600 bg-gray-800 border-gray-700 rounded"
                            />
                            <span className="text-xs text-gray-400">Ekle</span>
                          </label>
                          <label className="flex items-center space-x-1">
                            <input
                              type="checkbox"
                              checked={selectedPermissions[page.path]?.can_edit || false}
                              onChange={() => togglePermission(page.path, 'can_edit')}
                              className="w-3 h-3 text-blue-600 bg-gray-800 border-gray-700 rounded"
                            />
                            <span className="text-xs text-gray-400">Düz</span>
                          </label>
                          <label className="flex items-center space-x-1">
                            <input
                              type="checkbox"
                              checked={selectedPermissions[page.path]?.can_delete || false}
                              onChange={() => togglePermission(page.path, 'can_delete')}
                              className="w-3 h-3 text-blue-600 bg-gray-800 border-gray-700 rounded"
                            />
                            <span className="text-xs text-gray-400">Sil</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition text-white text-sm"
            >
              <X className="w-4 h-4 inline mr-1" />
              İptal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              <Save className="w-4 h-4 inline mr-1" />
              {editingUserId ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}

      {/* Sekmeler: Kullanıcılar (sistem) / Bayiler */}
      <div className="flex gap-2 mb-4 border-b border-gray-800 pb-2">
        <button
          type="button"
          onClick={() => setUserListTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            userListTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Kullanıcılar
          {users.filter((u) => (u.role || '').toString().trim().toLowerCase() !== 'bayi').length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs bg-gray-700">
              {users.filter((u) => (u.role || '').toString().trim().toLowerCase() !== 'bayi').length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setUserListTab('bayiler')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            userListTab === 'bayiler' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Bayiler
          {users.filter((u) => (u.role || '').toString().trim().toLowerCase() === 'bayi').length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs bg-gray-700">
              {users.filter((u) => (u.role || '').toString().trim().toLowerCase() === 'bayi').length}
            </span>
          )}
        </button>
      </div>

      {/* Kullanıcı Listesi */}
      {loading ? (
        <PageLoader fullScreen label="Kullanıcılar yükleniyor..." />
      ) : users.length === 0 ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <EmptyState
            title="Henüz kullanıcı yok"
            description="Yeni kullanıcı ekleyerek başlayın"
            icon={Users}
            action={
              <button
                onClick={() => { setShowAddForm(true); cancelEdit() }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2 text-sm"
              >
                <UserPlus size={18} />
                <span>Yeni Kullanıcı</span>
              </button>
            }
          />
        </div>
      ) : displayedUsers.length === 0 ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <EmptyState
            title={userListTab === 'bayiler' ? 'Henüz bayi kullanıcı yok' : 'Henüz kullanıcı yok'}
            description={userListTab === 'bayiler' ? 'Rolü "Bayi" olan kullanıcılar burada listelenir.' : 'Yeni kullanıcı ekleyerek başlayın'}
            icon={Users}
            action={
              userListTab === 'bayiler' ? (
                <button
                  onClick={() => setUserListTab('all')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition text-sm"
                >
                  Kullanıcılar
                </button>
              ) : (
                <button
                  onClick={() => { setShowAddForm(true); cancelEdit() }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2 text-sm"
                >
                  <UserPlus size={18} />
                  <span>Yeni Kullanıcı</span>
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Kullanıcı Adı</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Ad Soyad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Görev</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Rol</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Pozisyon</th>
                  {userListTab === 'bayiler' && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Cari (Bayi)</th>}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Durum</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Kilit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Aktif</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Son Giriş</th>
                  {isStrictAdmin && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Şifre</th>}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {displayedUsers.map((userRow) => (
                    <tr key={userRow.id} className="hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm text-white font-mono">{userRow.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{userRow.full_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{userRow.job_title || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {(() => {
                          const roleLabels: Record<string, { label: string; className: string; icon: any }> = {
                            admin: { label: 'Admin', className: 'bg-red-900 text-red-300', icon: Shield },
                            yönetici: { label: 'Yönetici', className: 'bg-red-800 text-red-200', icon: Shield },
                            yonetici: { label: 'Yönetici', className: 'bg-red-800 text-red-200', icon: Shield },
                            user: { label: 'Kullanıcı', className: 'bg-blue-900 text-blue-300', icon: Users },
                            bayi: { label: 'Bayi', className: 'bg-emerald-900 text-emerald-300', icon: Users },
                          }
                          const roleInfo = roleLabels[userRow.role] || { label: userRow.role, className: 'bg-gray-900 text-gray-300', icon: Users }
                          const Icon = roleInfo.icon
                          return (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleInfo.className}`}>
                              <Icon className="w-3 h-3 mr-1" />
                              {roleInfo.label}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(() => {
                          const positionLabels: Record<string, { label: string; className: string; icon: any }> = {
                            genel_mudur: { label: 'Genel Müdür', className: 'bg-purple-900 text-purple-300', icon: Shield },
                            uretim_muduru: { label: 'Üretim Müdürü', className: 'bg-orange-900 text-orange-300', icon: Users },
                            uretim_sorumlusu: { label: 'Üretim Sorumlusu', className: 'bg-yellow-900 text-yellow-300', icon: Users },
                            usta: { label: 'Usta', className: 'bg-green-900 text-green-300', icon: Users },
                            terzi: { label: 'Terzi', className: 'bg-teal-900 text-teal-300', icon: Users },
                            depo_sorumlusu: { label: 'Depo Sorumlusu', className: 'bg-cyan-900 text-cyan-300', icon: Users },
                            satis_sorumlusu: { label: 'Satış Sorumlusu', className: 'bg-indigo-900 text-indigo-300', icon: Users },
                            muhasebe: { label: 'Muhasebe', className: 'bg-pink-900 text-pink-300', icon: Users },
                            kalite_kontrol: { label: 'Kalite Kontrol', className: 'bg-emerald-900 text-emerald-300', icon: Users },
                            planlama: { label: 'Planlama', className: 'bg-violet-900 text-violet-300', icon: Users },
                            sevkiyat: { label: 'Sevkiyat', className: 'bg-amber-900 text-amber-300', icon: Users },
                            bayi: { label: 'Bayi', className: 'bg-emerald-900 text-emerald-300', icon: Users },
                          }
                          const position = (userRow as any).position
                          if (!position) {
                            return <span className="text-gray-400 text-xs">-</span>
                          }
                          const positionInfo = positionLabels[position] || { label: position, className: 'bg-gray-800 text-gray-300', icon: Users }
                          const Icon = positionInfo.icon
                          return (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${positionInfo.className}`}>
                              <Icon className="w-3 h-3 mr-1" />
                              {positionInfo.label}
                            </span>
                          )
                        })()}
                      </td>
                      {userListTab === 'bayiler' && (
                        <td className="px-4 py-3 text-sm text-gray-300">{(userRow as any).dealer_name || '-'}</td>
                      )}
                      <td className="px-4 py-3 text-sm">
                        {userRow.is_approved === 1 ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Onaylı
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900 text-yellow-300">
                            <XCircle className="w-3 h-3 mr-1" />
                            Beklemede
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {userRow.is_locked ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900 text-red-300" title="Hesap kilitli">
                            <Shield className="w-3 h-3 mr-1" />
                            Kilitli
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">Aktif</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {userRow.is_online ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300" title="Online / Aktif">
                            <Circle className="w-3 h-3 mr-1 fill-current" />
                            Aktif
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">Çevrimdışı</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {formatDateTime(userRow.last_login)}
                      </td>
                      {isStrictAdmin && (
                        <td className="px-4 py-3 text-sm">
                          <span className="text-gray-500 text-xs mr-2">••••••</span>
                          <button
                            type="button"
                            onClick={() => handleResetPassword(userRow)}
                            disabled={resettingPasswordId === userRow.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-amber-600/80 text-white rounded hover:bg-amber-600 transition text-xs disabled:opacity-50"
                            title="Yeni şifre belirle ve bir kez görüntüle"
                          >
                            <KeyRound className="w-3 h-3" />
                            {resettingPasswordId === userRow.id ? '...' : 'Sıfırla'}
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => startEdit(userRow)}
                            className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-xs"
                            title="Kullanıcıyı düzenle (şifre dahil)"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Düzenle
                          </button>
                          {userRow.role !== 'admin' && (
                            <button
                              onClick={() => handleDelete(userRow.id)}
                              className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                              title="Sil"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

