'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Users, Building2, Edit, Trash2, X } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { LogoWithBackground } from '@/components/Logo'
import { useApi } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'

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
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'customer',
    tax_number: '',
    phone: '',
    email: '',
    address: ''
  })

  const accountsUrl = useMemo(() => (
    filterType === 'all'
      ? '/api/accounts'
      : `/api/accounts?type=${filterType}`
  ), [filterType])

  const { data: accountsData, isLoading, mutate } = useApi<Account[]>(accountsUrl)

  const accounts = useMemo(() => {
    const list = accountsData ?? []
    return [...list].sort((a, b) => {
      const codeA = a.code || ''
      const codeB = b.code || ''
      return codeA.localeCompare(codeB, 'tr', { numeric: true })
    })
  }, [accountsData])

  const filteredAccounts = accounts.filter((account) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      account.name.toLowerCase().includes(searchLower) ||
      account.code.toLowerCase().includes(searchLower) ||
      (account.tax_number && account.tax_number.toLowerCase().includes(searchLower)) ||
      (account.phone && account.phone.toLowerCase().includes(searchLower))
    )
  })

  function handleEdit(account: Account) {
    // Sayfayı yukarı kaydır (işlem alanına)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
    setEditingAccount(account)
    setEditForm({
      name: account.name,
      type: account.type,
      tax_number: account.tax_number || '',
      phone: account.phone || '',
      email: account.email || '',
      address: account.address || ''
    })
    setShowEditModal(true)
  }

  async function handleUpdate() {
    if (!editingAccount) return
    
    try {
      const response = await fetch(`/api/accounts/${editingAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          updated_by: userId
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Güncelleme başarısız')
      }
      
      alert('✅ Cari hesap başarıyla güncellendi')
      setShowEditModal(false)
      setEditingAccount(null)
      await mutate()
    } catch (error: any) {
      alert('Hata: ' + error.message)
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
        throw new Error(error.error || 'Silme başarısız')
      }
      
      // State'ten hemen kaldır (optimistic update)
      mutate(
        (current) => current?.filter(acc => acc.id !== account.id),
        { revalidate: false }
      )
      
      alert('✅ Cari hesap başarıyla silindi')
      
      // Veritabanından tekrar yükle (senkronizasyon için)
      await mutate()
    } catch (error: any) {
      alert('Hata: ' + error.message)
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
        <Link
          href="/accounts/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Yeni Cari Hesap</span>
        </Link>
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
              onChange={(e) => setFilterType(e.target.value)}
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
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
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
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-400 text-xs py-8">
                    {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz cari hesap eklenmemiş'}
                  </TableCell>
                </TableRow>
              ) : (
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
                      account.balance > 0 ? 'text-green-400' : 
                      account.balance < 0 ? 'text-red-400' : 
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
                      {new Date(account.created_at).toLocaleDateString('tr-TR')}
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
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
                  Adres
                </label>
                <textarea
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingAccount(null)
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

