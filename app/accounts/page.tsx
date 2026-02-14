'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Users, Building2, Edit, Trash2, X, FileDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { LogoWithBackground } from '@/components/Logo'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { usePaginatedApi, getAuthHeaders } from '@/lib/api/client'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { formatDate } from '@/lib/utils/dateFormat'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'

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
  authorized_person_name?: string | null
  authorized_person_phone?: string | null
  created_at: string
  updated_at?: string
  created_by?: string
  updated_by?: string
  created_by_name?: string
  created_by_username?: string
  updated_by_name?: string
  updated_by_username?: string
}

export default function AccountsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const user = useAuthStore((state) => state.user)
  const userId = user?.id ?? null
  const isBayi = (user?.role ?? '').toString().trim().toLowerCase() === 'bayi'
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'customer',
    tax_number: '',
    phone: '',
    email: '',
    address: '',
    risk_limit: '',
    discount_rate: '',
    authorized_person_name: '',
    authorized_person_phone: ''
  })
  const [applyDiscountToShipments, setApplyDiscountToShipments] = useState(false)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const accountsUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))
    if (filterType !== 'all') params.set('type', filterType)
    return `/api/accounts?${params.toString()}`
  }, [filterType, page])

  const { data: accountsData, meta, isLoading, mutate } = usePaginatedApi<Account>(accountsUrl)
  const { total, limit, offset } = meta
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.floor(offset / limit) + 1
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const accounts = useMemo(() => {
    const list = accountsData ?? []
    return [...list].sort((a: Account, b: Account) => {
      const codeA = a.code || ''
      const codeB = b.code || ''
      return codeA.localeCompare(codeB, 'tr', { numeric: true })
    })
  }, [accountsData])

  const filteredAccounts = accounts.filter((account) => {
    const searchLower = debouncedSearchTerm.toLowerCase()
    return (
      account.name.toLowerCase().includes(searchLower) ||
      account.code.toLowerCase().includes(searchLower) ||
      (account.tax_number && account.tax_number.toLowerCase().includes(searchLower)) ||
      (account.phone && account.phone.toLowerCase().includes(searchLower))
    )
  })

  async function handleEdit(account: Account) {
    if (isBayi) return
    setEditingAccount(account)
    const fillForm = (a: Account) => ({
      name: a.name,
      type: a.type,
      tax_number: a.tax_number || '',
      phone: a.phone || '',
      email: a.email || '',
      address: a.address || '',
      risk_limit: a.risk_limit != null ? String(a.risk_limit) : '',
      discount_rate: a.discount_rate != null ? String(a.discount_rate) : '',
      authorized_person_name: a.authorized_person_name || '',
      authorized_person_phone: a.authorized_person_phone || ''
    })
    setEditForm(fillForm(account))
    setShowEditModal(true)
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
    // Başka cihazda güncellenmiş veriyi göstermek için sunucudan güncel cari çek
    try {
      const res = await fetch(`/api/accounts/${account.id}`, { headers: getAuthHeaders(), credentials: 'include' })
      if (res.ok) {
        const json = await res.json()
        const data = json?.data ?? json
        if (data && typeof data === 'object') {
          setEditForm(fillForm({ ...account, ...data }))
        }
      }
    } catch {
      // Ağ hatasında listedeki veri zaten dolu
    }
  }

  async function handleUpdate() {
    if (!editingAccount) return
    
    try {
      const url = `/api/accounts/${editingAccount.id}${applyDiscountToShipments ? '?apply_discount_to_shipments=1' : ''}`
      const rawDiscount = editForm.discount_rate.trim().replace(',', '.')
      const discountRate = rawDiscount === '' ? null : (Number(rawDiscount) || null)
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          ...editForm,
          risk_limit: editForm.risk_limit.trim() === '' ? null : Number(editForm.risk_limit),
          discount_rate: discountRate,
          authorized_person_name: editForm.authorized_person_name.trim() || null,
          authorized_person_phone: editForm.authorized_person_phone.trim() || null,
          updated_by: userId
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        let errorMessage = error.error || 'Güncelleme başarısız'
        // Hata mesajını Türkçe'ye çevir
        if (errorMessage.includes('no such column')) {
          errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen veritabanını güncelleyin.'
        } else if (errorMessage.includes('UNIQUE constraint')) {
          errorMessage = 'Bu kod zaten kullanılıyor. Lütfen farklı bir kod seçin.'
        } else if (errorMessage.includes('FOREIGN KEY')) {
          errorMessage = 'İlişkili kayıt bulunamadı.'
        } else if (errorMessage.includes('NOT NULL')) {
          errorMessage = 'Zorunlu alanlar eksik.'
        }
        throw new Error(errorMessage)
      }
      
      toast.success(applyDiscountToShipments ? 'Cari güncellendi; iskonto oranı sevkiyat fişlerine uygulandı.' : 'Cari hesap başarıyla güncellendi')
      setShowEditModal(false)
      setEditingAccount(null)
      setApplyDiscountToShipments(false)
      await mutate()
    } catch (error: unknown) {
      let errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata'
      if (errorMessage.includes('no such column')) {
        errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen veritabanını güncelleyin.'
      } else if (errorMessage.includes('UNIQUE constraint')) {
        errorMessage = 'Bu kod zaten kullanılıyor. Lütfen farklı bir kod seçin.'
      } else if (errorMessage.includes('FOREIGN KEY')) {
        errorMessage = 'İlişkili kayıt bulunamadı.'
      } else if (errorMessage.includes('NOT NULL')) {
        errorMessage = 'Zorunlu alanlar eksik.'
      }
      toast.error(errorMessage)
    }
  }

  async function handleDelete(account: Account) {
    if (!confirm(`${account.name} adlı cari hesabı silmek istediğinize emin misiniz?`)) {
      return
    }
    
    // Sayfayı yukarı kaydır
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
    
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'DELETE',
        cache: 'no-store'
      })
      
      if (!response.ok) {
        const error = await response.json()
        let errorMessage = error.error || 'Silme başarısız'
        // Hata mesajını Türkçe'ye çevir
        if (errorMessage.includes('no such column')) {
          errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen veritabanını güncelleyin.'
        } else if (errorMessage.includes('kullanılıyor')) {
          errorMessage = 'Bu cari hesap kullanılıyor, silinemez'
        } else if (errorMessage.includes('UNIQUE constraint')) {
          errorMessage = 'Bu kod zaten kullanılıyor. Lütfen farklı bir kod seçin.'
        } else if (errorMessage.includes('FOREIGN KEY')) {
          errorMessage = 'İlişkili kayıt bulunamadı.'
        }
        throw new Error(errorMessage)
      }
      
      // State'ten hemen kaldır (optimistic update)
      mutate(
        (prev) => prev ? { ...prev, list: prev.list.filter(acc => acc.id !== account.id) } : prev,
        { revalidate: false }
      )
      
      toast.success('Cari hesap başarıyla silindi')
      
      // Veritabanından tekrar yükle (senkronizasyon için)
      await mutate()
    } catch (error: unknown) {
      let errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata'
      if (errorMessage.includes('no such column')) {
        errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen veritabanını güncelleyin.'
      } else if (errorMessage.includes('kullanılıyor')) {
        errorMessage = 'Bu cari hesap kullanılıyor, silinemez'
      } else if (errorMessage.includes('UNIQUE constraint')) {
        errorMessage = 'Bu kod zaten kullanılıyor. Lütfen farklı bir kod seçin.'
      } else if (errorMessage.includes('FOREIGN KEY')) {
        errorMessage = 'İlişkili kayıt bulunamadı.'
      }
      toast.error(errorMessage)
      // Hata durumunda tekrar yükle
      await mutate()
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Cari Hesaplar</h1>
            <LogoWithBackground size="sm" />
          </div>
          <p className="text-gray-400 mt-1">Müşteri ve tedarikçi yönetimi</p>
        </div>
        <div className="flex items-center gap-2">
        <button
          onClick={async () => {
            if (!confirm('Tüm cari hesapları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return
            try {
              const res = await fetch('/api/accounts?all=1', { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' })
              if (!res.ok) throw new Error((await res.json()).error || 'Silinemedi')
              const data = await res.json()
              mutate()
              toast.success(data?.message || 'Cariler silindi.')
            } catch (e: any) {
              toast.error(e.message || 'Cariler silinemedi')
            }
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition inline-flex items-center space-x-2"
        >
          <Trash2 size={20} />
          <span>Tüm Carileri Sil</span>
        </button>
        {!isBayi && (
          <button
            type="button"
            onClick={async () => {
              try {
                const params = new URLSearchParams()
                if (filterType !== 'all') params.set('type', filterType)
                const res = await fetch(`/api/accounts/export${params.toString() ? '?' + params.toString() : ''}`, { credentials: 'include', headers: getAuthHeaders() })
                if (!res.ok) throw new Error(res.status === 403 ? 'Yetkiniz yok' : 'İndirme başarısız')
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `cari_hesaplar_${new Date().toISOString().split('T')[0]}.xlsx`
                a.click()
                URL.revokeObjectURL(url)
                toast.success('Excel dosyası indirildi')
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'İndirme başarısız')
              }
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition inline-flex items-center space-x-2"
          >
            <FileDown size={20} />
            <span>Excel İndir</span>
          </button>
        )}
        <Link
          href="/accounts/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Yeni Cari Hesap</span>
        </Link>
      </div>
      </div>

      {/* Filtreler */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Search className="w-4 h-4 inline mr-2" />
              Ara (Ad, Kod, Vergi No, Telefon)
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ara..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tip Filtresi
            </label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(0) }}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tümü</option>
              <option value="customer">Müşteri</option>
              <option value="supplier">Tedarikçi</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <PageLoader fullScreen label="Cariler yükleniyor..." />
      ) : filteredAccounts.length === 0 ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <EmptyState
            title={searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz cari hesap yok'}
            description={searchTerm ? 'Farklı bir arama deneyin' : 'Yeni cari hesap ekleyerek başlayın'}
            icon={Building2}
            action={!searchTerm ? (
              <Link href="/accounts/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center">
                <Plus size={18} className="mr-2" />
                Yeni Cari Hesap
              </Link>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="h-8">Kod</TableHead>
                <TableHead className="h-8">Ad/Ünvan</TableHead>
                <TableHead className="h-8">Tip</TableHead>
                <TableHead className="h-8">Vergi No</TableHead>
                <TableHead className="h-8">Telefon</TableHead>
                <TableHead className="h-8">Bakiye</TableHead>
                <TableHead className="h-8">Oluşturan</TableHead>
                <TableHead className="h-8">Güncelleyen</TableHead>
                <TableHead className="h-8">Tarih</TableHead>
                <TableHead className="h-8">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {
                filteredAccounts.map((account) => (
                  <TableRow 
                    key={account.id}
                    className="hover:bg-gray-800 cursor-pointer"
                    onDoubleClick={() => {
                      window.location.href = `/accounts/${account.id}`
                    }}
                  >
                    <TableCell>
                      <div className="text-xs font-mono font-bold text-white">
                        {account.code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-white">{account.name}</div>
                    </TableCell>
                    <TableCell>
                      {account.type === 'customer' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-300">
                          <Users className="w-3 h-3 mr-1" />
                          Müşteri
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
                          <Building2 className="w-3 h-3 mr-1" />
                          Tedarikçi
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {account.tax_number || '-'}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {account.phone || '-'}
                    </TableCell>
                    <TableCell className={`text-xs font-semibold ${
                      account.balance > 0 ? 'text-red-400' : 
                      account.balance < 0 ? 'text-green-400' : 
                      'text-gray-400'
                    }`}>
                      {account.balance.toLocaleString('tr-TR', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })} ₺
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {account.created_by_name || account.created_by_username || '-'}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {account.updated_by_name || account.updated_by_username || '-'}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {formatDate(account.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(account)}
                          className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(account)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition text-xs"
                          title="Cari hesabı sil"
                        >
                          <Trash2 className="w-4 h-4" />
                          Sil
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && total > 0 && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-sm text-gray-400">
            {from}-{to} / {total} kayıt
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Önceki
            </Button>
            <span className="text-sm text-gray-300 px-2">
              Sayfa {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Sonraki
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Düzenleme Modalı */}
      {showEditModal && editingAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Cari Hesap Düzenle</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingAccount(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleUpdate()
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Ad/Ünvan <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tip <span className="text-red-400">*</span>
                </label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="customer">Müşteri</option>
                  <option value="supplier">Tedarikçi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Vergi No / TC Kimlik No
                </label>
                <input
                  type="text"
                  value={editForm.tax_number}
                  onChange={(e) => setEditForm({ ...editForm, tax_number: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Telefon
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  E-posta
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Risk Limiti (₺)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.risk_limit}
                  onChange={(e) => setEditForm({ ...editForm, risk_limit: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  İskonto Oranı (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editForm.discount_rate}
                  onChange={(e) => setEditForm({ ...editForm, discount_rate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Örn: 5.00"
                />
                <label className="mt-2 flex items-center gap-2 cursor-pointer text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={applyDiscountToShipments}
                    onChange={(e) => setApplyDiscountToShipments(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                  />
                  <span>Bir seferlik: İskonto oranını bu carinin tüm sevkiyat fişlerine uygula</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Adres
                </label>
                <textarea
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Yetkili Kişi Adı
                </label>
                <input
                  type="text"
                  value={editForm.authorized_person_name}
                  onChange={(e) => setEditForm({ ...editForm, authorized_person_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Yetkili kişi adı"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Yetkili Kişi Telefonu
                </label>
                <input
                  type="tel"
                  value={editForm.authorized_person_phone}
                  onChange={(e) => setEditForm({ ...editForm, authorized_person_phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Yetkili kişi telefonu"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingAccount(null)
                    setApplyDiscountToShipments(false)
                  }}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* İstatistikler */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Toplam Cari Hesap</div>
          <div className="text-2xl font-bold text-white">{accounts.length}</div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Müşteri</div>
          <div className="text-2xl font-bold text-blue-400">
            {accounts.filter((a) => a.type === 'customer').length}
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <div className="text-sm text-gray-400 mb-1">Tedarikçi</div>
          <div className="text-2xl font-bold text-green-400">
            {accounts.filter((a) => a.type === 'supplier').length}
          </div>
        </div>
      </div>
    </div>
  )
}

