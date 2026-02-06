'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, UserPlus, CheckCircle, XCircle, Edit, Trash2, Save, X, Shield, Circle } from 'lucide-react'
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
  approved_by?: string
  approved_at?: string
  created_at: string
  last_login?: string
  is_online?: boolean
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
    is_approved: false,
  })
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, {
    can_view: boolean
    can_create: boolean
    can_edit: boolean
    can_delete: boolean
  }>>({})
  const currentUserId = useAuthStore((state) => state.user?.id ?? null)
  const user = useAuthStore((state) => state.user)
  const router = useRouter()

  // Sadece admin/yönetici kullanıcılar sayfayı görebilir
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
  }, [user])

  // Rol değiştiğinde yönetici ise tüm izinleri otomatik aktif et
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
      is_approved: user.is_approved === 1,
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
      is_approved: false,
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
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {editingUserId ? 'Yeni Şifre (değiştirmek istemiyorsanız boş bırakın)' : 'Şifre *'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required={!editingUserId}
                minLength={6}
              />
              {editingUserId && (
                <p className="mt-1 text-xs text-gray-500">
                  Şifreler güvenlik nedeniyle şifrelenmiş saklanır; görüntülenemez. Sadece yeni şifre belirleyebilirsiniz.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Rol *</label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const newRole = e.target.value
                  setFormData({ ...formData, role: newRole })
                  
                  // Yönetici veya Admin seçildiğinde tüm izinleri otomatik aktif et
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
                  }
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              >
                <option value="user">Kullanıcı</option>
                <option value="admin">Admin</option>
                <option value="yönetici">Yönetici</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Pozisyon</label>
              <select
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Durum</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Aktif</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Son Giriş</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm text-white font-mono">{user.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{user.full_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{user.job_title || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {(() => {
                          const roleLabels: Record<string, { label: string; className: string; icon: any }> = {
                            admin: { label: 'Admin', className: 'bg-red-900 text-red-300', icon: Shield },
                            yönetici: { label: 'Yönetici', className: 'bg-red-800 text-red-200', icon: Shield },
                            yonetici: { label: 'Yönetici', className: 'bg-red-800 text-red-200', icon: Shield },
                            user: { label: 'Kullanıcı', className: 'bg-blue-900 text-blue-300', icon: Users },
                          }
                          const roleInfo = roleLabels[user.role] || { label: user.role, className: 'bg-gray-900 text-gray-300', icon: Users }
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
                          }
                          const position = (user as any).position
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
                      <td className="px-4 py-3 text-sm">
                        {user.is_approved === 1 ? (
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
                        {user.is_online ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300" title="Online / Aktif">
                            <Circle className="w-3 h-3 mr-1 fill-current" />
                            Aktif
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">Çevrimdışı</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {formatDateTime(user.last_login)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            title="Düzenle"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => handleDelete(user.id)}
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

