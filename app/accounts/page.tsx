'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Search, Users, Building2, Edit, Trash2, X, FileDown, ChevronLeft, ChevronRight, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { LogoWithBackground } from '@/components/Logo'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { usePaginatedApi, getAuthHeaders } from '@/lib/api/client'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { formatDate } from '@/lib/utils/dateFormat'
import { useAuthStore } from '@/lib/store/authStore'
import { toast } from '@/lib/notify'
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { NewFeatureHighlight } from '@/components/NewFeatureHighlight'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from '@/components/ui/ContextMenu'
import { Copy, PlusCircle, FileText, ShoppingCart } from 'lucide-react'
import { DataTable, EditableCell } from '@/components/ui/DataTable'
import { ColumnDef } from '@tanstack/react-table'

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

const APP_TITLE = 'LIVASOFA ERP'

export default function AccountsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  useEffect(() => { document.title = `Cari Hesaplar - ${APP_TITLE}`; return () => { document.title = APP_TITLE } }, [])
  const typeFromUrl = searchParams.get('type')
  const debtFromUrl = searchParams.get('has_debt')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterBalance, setFilterBalance] = useState<string>('all') // all, debt, credit, zero

  useEffect(() => {
    if (typeFromUrl === 'customer' || typeFromUrl === 'supplier') setFilterType(typeFromUrl)
    if (debtFromUrl === '1') setFilterBalance('debt')
  }, [typeFromUrl, debtFromUrl])

  type SortKeyAccount = 'code' | 'name' | 'balance' | 'type' | 'created_at'
  const [sortKey, setSortKey] = useState<SortKeyAccount>('code')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const user = useAuthStore((state) => state.user)
  const userId = user?.id ?? null
  const isBayi = (user?.role ?? '').toString().trim().toLowerCase() === 'bayi'
  const canExport = user?.can_export !== 0
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
  const [creatingFromOrders, setCreatingFromOrders] = useState(false)
  const autoCreateAttemptedRef = useRef(false)
  const editFormRef = useRef<HTMLFormElement>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const accountsUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))
    if (filterType !== 'all') params.set('type', filterType)
    if (filterBalance !== 'all') params.set('balance', filterBalance)
    return `/api/accounts?${params.toString()}`
  }, [filterType, filterBalance, page])

  const { data: accountsData, meta, isLoading, error: listError, mutate } = usePaginatedApi<Account>(accountsUrl, {
    revalidateIfStale: true,
    revalidateOnMount: true,
  })
  const { total, limit, offset } = meta

  // "Tümü"ne geçildiğinde listeyi yeniden doğrula (önbellekte boş liste kalmasın)
  const didRevalidateForAllRef = useRef(false)
  useEffect(() => {
    if (filterType !== 'all') {
      didRevalidateForAllRef.current = false
      return
    }
    if (didRevalidateForAllRef.current) return
    didRevalidateForAllRef.current = true
    mutate()
  }, [filterType, mutate])

  // Liste boşken bir kez siparişlerden cari oluşturmayı dene; böylece ilk açılışta cariler gelir.
  const createAccountsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (isBayi || isLoading || creatingFromOrders || autoCreateAttemptedRef.current || total !== 0) return
    let cancelled = false
    autoCreateAttemptedRef.current = true
    setCreatingFromOrders(true)
    // Takılı kalmayı önle: en fazla 20 saniye sonra "Ekleniyor" kapat
    createAccountsTimeoutRef.current = setTimeout(() => {
      if (cancelled) return
      cancelled = true
      setCreatingFromOrders(false)
      toast.error('İstek zaman aşımına uğradı. "Siparişlerden Carileri Ekle" ile tekrar deneyin.')
    }, 20_000)
    fetch('/api/orders/create-accounts', { method: 'POST', headers: getAuthHeaders(), credentials: 'include' })
      .then((res) => res.json().catch(() => ({})) as Promise<{ created?: number; existing?: number; message?: string; error?: string }>)
      .then((data) => {
        if (cancelled) return
        if ((data?.created ?? 0) > 0 || (data?.existing ?? 0) > 0) {
          toast.success(data?.message ?? `${data?.created ?? 0} yeni cari eklendi.`)
          mutate()
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Siparişlerden cari eklenirken hata oluştu')
      })
      .finally(() => {
        if (createAccountsTimeoutRef.current) {
          clearTimeout(createAccountsTimeoutRef.current)
          createAccountsTimeoutRef.current = null
        }
        if (!cancelled) setCreatingFromOrders(false)
      })
    return () => {
      cancelled = true
      if (createAccountsTimeoutRef.current) {
        clearTimeout(createAccountsTimeoutRef.current)
        createAccountsTimeoutRef.current = null
      }
      setCreatingFromOrders(false)
    }
  }, [total, isLoading, creatingFromOrders, isBayi, mutate])

  async function createAccountsFromOrders() {
    setCreatingFromOrders(true)
    const timeoutMs = 25_000
    const timeoutId = setTimeout(() => {
      setCreatingFromOrders(false)
      toast.error('İstek zaman aşımına uğradı. Ağ bağlantınızı kontrol edip tekrar deneyin.')
    }, timeoutMs)
    try {
      const res = await fetch('/api/orders/create-accounts', { method: 'POST', headers: getAuthHeaders(), credentials: 'include' })
      const data = await res.json().catch(() => ({})) as { created?: number; existing?: number; message?: string; error?: string }
      if (!res.ok) {
        toast.error(data?.error ?? 'Cari hesaplar oluşturulamadı')
        return
      }
      if ((data?.created ?? 0) > 0 || (data?.existing ?? 0) > 0) {
        toast.success(data?.message ?? `${data.created ?? 0} yeni cari eklendi, ${data.existing ?? 0} zaten mevcuttu.`)
      } else if ((data?.created ?? 0) === 0 && (data?.existing ?? 0) === 0) {
        toast.info('Eklenebilecek yeni cari yok; siparişlerdeki tüm cariler zaten kayıtlı.')
      }
      await mutate()
    } catch {
      toast.error('İşlem sırasında hata oluştu')
    } finally {
      clearTimeout(timeoutId)
      setCreatingFromOrders(false)
    }
  }
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

  const displayedAccounts = useMemo(() => {
    const list = [...filteredAccounts]
    list.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'code') cmp = (a.code || '').localeCompare(b.code || '', 'tr', { numeric: true })
      else if (sortKey === 'name') cmp = (a.name || '').localeCompare(b.name || '', 'tr')
      else if (sortKey === 'balance') cmp = (a.balance ?? 0) - (b.balance ?? 0)
      else if (sortKey === 'type') cmp = (a.type || '').localeCompare(b.type || '')
      else cmp = (a.created_at || '').localeCompare(b.created_at || '')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [filteredAccounts, sortKey, sortDir])

  function handleSortAccount(key: SortKeyAccount) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(key === 'balance' ? 'desc' : 'asc') }
  }
  function SortIconAccount({ column }: { column: SortKeyAccount }) {
    if (sortKey !== column) return null
    return sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" /> : <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />
  }

  useKeyboardShortcut('Enter', () => { if (selectedAccountId) router.push(`/accounts/${selectedAccountId}`) }, { enabled: !!selectedAccountId })
  useKeyboardShortcut('Escape', () => { if (showEditModal) setShowEditModal(false); else setSelectedAccountId(null) })
  useKeyboardShortcut('n', () => { if (!showEditModal) router.push('/accounts/new') }, { ctrlOrMeta: true })
  useKeyboardShortcut('s', () => { if (showEditModal && editFormRef.current) editFormRef.current.requestSubmit() }, { ctrlOrMeta: true, enabled: !!showEditModal })

  async function handleEdit(account: Account) {
    if (isBayi) return
    if (!account?.id) {
      toast.error('Cari seçilemedi; liste yenileniyor.')
      await mutate()
      return
    }
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
      if (res.status === 404) {
        setShowEditModal(false)
        setEditingAccount(null)
        mutate()
        toast.info('Seçilen cari bulunamadı, liste yenilendi.')
        return
      }
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
        const error = await response.json().catch(() => ({}))
        let errorMessage = error?.error || 'Güncelleme başarısız'
        if (response.status === 404) {
          setShowEditModal(false)
          setEditingAccount(null)
          setApplyDiscountToShipments(false)
          await mutate()
          toast.info('Seçilen cari bulunamadı, liste yenilendi.')
          return
        }
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

      const updatedAccount: Account = {
        ...editingAccount,
        name: editForm.name.trim(),
        type: editForm.type,
        tax_number: editForm.tax_number.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        email: editForm.email.trim() || undefined,
        address: editForm.address.trim() || undefined,
        risk_limit: editForm.risk_limit.trim() === '' ? null : Number(editForm.risk_limit),
        discount_rate: rawDiscount === '' ? null : discountRate,
        authorized_person_name: editForm.authorized_person_name.trim() || null,
        authorized_person_phone: editForm.authorized_person_phone.trim() || null,
      }
      // Önce listeyi güncellenmiş cari ile güncelle (sıfırlanma olmasın), sonra sunucudan yenile
      mutate(
        (prev) => {
          if (!prev?.list) return prev
          const list = prev.list.map((a) => (a.id === editingAccount.id ? { ...a, ...updatedAccount } : a))
          return { ...prev, list }
        },
        { revalidate: true }
      )
      toast.success(applyDiscountToShipments ? 'Cari güncellendi; iskonto oranı sevkiyat fişlerine uygulandı.' : 'Cari hesap başarıyla güncellendi')
      setShowEditModal(false)
      setEditingAccount(null)
      setApplyDiscountToShipments(false)
      // Tip değiştiyse (Müşteri ↔ Tedarikçi) filtreyi "Tümü" yap ki güncellenen cari listede görünsün
      if (editForm.type !== editingAccount.type) {
        setFilterType('all')
      }
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
        credentials: 'include',
        headers: getAuthHeaders(),
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

      // State'ten hemen kaldır (silinen cari anlık listeden düşsün)
      mutate(
        (prev) => prev ? { ...prev, list: prev.list.filter(acc => acc.id !== account.id) } : prev,
        { revalidate: false }
      )
      if (editingAccount?.id === account.id) {
        setShowEditModal(false)
        setEditingAccount(null)
      }
      setSelectedAccountId((id) => (id === account.id ? null : id))
      toast.success('Cari hesap silindi')
      // Listeyi sunucudan yenile; silinen cari bir daha görünmesin (önbellek kullanılmaz)
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

  // TanStack Table Columns Definition
  const columns = useMemo<ColumnDef<Account>[]>(() => [
    {
      accessorKey: 'code',
      header: 'Kod',
      cell: info => <div className="text-xs font-mono font-bold">{info.getValue() as string}</div>,
    },
    {
      accessorKey: 'name',
      header: 'Ad/Ünvan',
      cell: EditableCell,
    },
    {
      accessorKey: 'type',
      header: 'Tip',
      cell: info => {
        const val = info.getValue() as string
        if (val === 'customer') {
          return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-300">
              <Users className="w-3 h-3 mr-1" /> Müşteri
            </span>
          )
        }
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
            <Building2 className="w-3 h-3 mr-1" /> Tedarikçi
          </span>
        )
      }
    },
    {
      accessorKey: 'tax_number',
      header: 'Vergi No',
      cell: EditableCell,
    },
    {
      accessorKey: 'phone',
      header: 'Telefon',
      cell: EditableCell,
    },
    {
      accessorKey: 'balance',
      header: 'Bakiye',
      cell: info => {
        const balance = info.getValue() as number
        return (
          <div className={`text-xs font-semibold tabular-nums px-2 py-1 rounded ${balance > 0 ? 'text-red-300 bg-red-900/30' : balance < 0 ? 'text-green-300 bg-green-900/30' : 'text-gray-400'}`}>
            {balance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
          </div>
        )
      }
    },
    {
      accessorKey: 'created_at',
      header: 'Tarih',
      cell: info => <div className="text-gray-400 text-xs">{formatDate(info.getValue() as string)}</div>
    },
    {
      id: 'actions',
      header: 'İşlemler',
      cell: ({ row }) => {
        const account = row.original
        return (
          <div className="flex items-center space-x-2">
            <Link
              href={`/accounts/${account.id}`}
              className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition"
              title="Hesap Kartı / Detayına Git"
            >
              <FileText className="w-4 h-4" />
            </Link>
            <button
              onClick={(e) => { e.stopPropagation(); handleEdit(account); }}
              className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded transition"
              title="Düzenle"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(account); }}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition text-xs"
              title="Cari hesabı sil"
            >
              <Trash2 className="w-4 h-4" />
              Sil
            </button>
          </div>
        )
      }
    }
  ], [handleEdit, handleDelete])

  const handleInlineEdit = async (originalRow: Account, columnId: string, newValue: any): Promise<boolean> => {
    try {
      if (isBayi) {
        toast.error('Düzenleme yetkiniz yok')
        return false
      }
      const response = await fetch(`/api/accounts/${originalRow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        credentials: 'include',
        body: JSON.stringify({
          ...originalRow,
          [columnId]: newValue,
          updated_by: userId
        })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error?.error || 'Güncelleme başarısız')
      }

      toast.success('Hücre güncellendi')

      // Update local SWR cache silently
      mutate((prev) => {
        if (!prev?.list) return prev
        const list = prev.list.map((a) => (a.id === originalRow.id ? { ...a, [columnId]: newValue } : a))
        return { ...prev, list }
      }, false)

      return true;
    } catch (err: any) {
      toast.error(err.message || 'Hücre kaydedilemedi')
      return false
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
            type="button"
            onClick={() => mutate()}
            disabled={isLoading}
            title="Listeyi yenile"
            className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-600 transition disabled:opacity-50 inline-flex items-center space-x-2"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            <span>Yenile</span>
          </button>
          {!isBayi && (
            <button
              type="button"
              title="Siparişlerde görünüp caride olmayan müşteri adları (örn. ÖZKARDEŞLER YOZGAT) bu butonla cari olarak eklenir."
              onClick={createAccountsFromOrders}
              disabled={creatingFromOrders}
              className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-500 transition disabled:opacity-50 inline-flex items-center space-x-2"
            >
              <Users size={20} />
              <span>{creatingFromOrders ? 'Ekleniyor...' : 'Siparişlerden Carileri Ekle'}</span>
            </button>
          )}
          {!isBayi && canExport && (
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
          <NewFeatureHighlight featureId="cari_fatura_arama">
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
          </NewFeatureHighlight>
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bakiye Filtresi
            </label>
            <select
              value={filterBalance}
              onChange={(e) => { setFilterBalance(e.target.value); setPage(0) }}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tümü</option>
              <option value="debt">Borçlu (bakiye &gt; 0)</option>
              <option value="credit">Alacaklı (bakiye &lt; 0)</option>
              <option value="zero">Bakiye sıfır</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} cols={8} />
      ) : listError ? (
        <div className="bg-gray-900 rounded-lg border border-amber-800 overflow-hidden p-6">
          <div className="max-w-lg mx-auto text-center">
            <p className="text-amber-400 font-medium mb-2">Cari listesi yüklenemedi</p>
            <p className="text-gray-400 text-sm mb-4">
              {listError?.message?.includes('403') || listError?.message?.toLowerCase().includes('erişemez')
                ? 'Cari listesine sadece yöneticiler erişebilir. Bayi kullanıcıları "Cari Hesabım" sayfasını kullanmalıdır.'
                : 'Ağ hatası veya yetki sorunu olabilir. Yenile butonuna tıklayın.'}
            </p>
            <button
              type="button"
              onClick={() => mutate()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition"
            >
              Yenile
            </button>
          </div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <EmptyState
            title={searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz cari hesap yok'}
            description={searchTerm ? 'Farklı bir arama deneyin' : 'İlk cari hesabı ekleyin veya siparişlerden toplu aktarın.'}
            icon={Building2}
            action={!searchTerm ? (
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/accounts/new">
                  <Button variant="solid" color="primary" size="sm" className="inline-flex items-center gap-2">
                    <Plus size={18} />
                    İlk cari hesabı ekle
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={createAccountsFromOrders}
                  disabled={creatingFromOrders}
                  className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-500 transition disabled:opacity-50 inline-flex items-center"
                >
                  <Users size={18} className="mr-2" />
                  {creatingFromOrders ? 'Ekleniyor...' : 'Siparişlerden carileri ekle'}
                </button>
              </div>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          {/* Toplam / sayfa bilgisi: "36 cari var, 20 görünüyor" tutarsızlığını giderir */}
          {total > 0 && (
            <div className="px-4 py-3 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-gray-800/30">
              <span className="text-sm text-gray-300">
                Toplam <strong className="text-white">{total}</strong> cari
                {total > limit && (
                  <span className="text-gray-400 ml-1">
                    — Bu sayfada <strong className="text-white">{from}-{to}</strong> arası gösteriliyor
                    {totalPages > 1 && (
                      <span className="ml-1">(Sayfa {currentPage} / {totalPages})</span>
                    )}
                  </span>
                )}
              </span>
              {totalPages > 1 && (
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
              )}
            </div>
          )}
          <DataTable
            columns={columns}
            data={displayedAccounts}
            onRowEdit={handleInlineEdit}
            onRowDoubleClick={(row) => router.push(`/accounts/${row.id}`)}
            contextMenuItems={(row) => [
              {
                label: 'Hesap Detayı / Döküm',
                icon: FileText,
                onClick: (row) => router.push(`/accounts/${row.id}`)
              },
              {
                label: 'Düzenle',
                icon: Edit,
                onClick: (row) => handleEdit(row)
              },
              { label: 'separator', onClick: () => { } },
              {
                label: 'Bu Cariyi Sil',
                icon: Trash2,
                variant: 'danger',
                onClick: (row) => handleDelete(row)
              }
            ]}
          />
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
              ref={editFormRef}
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

