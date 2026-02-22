'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, Pencil, Trash2, FileText, RefreshCw, Users, ChevronDown } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { LogoWithBackground } from '@/components/Logo'
import { EmptyState } from '@/components/ui/EmptyState'
import { fetchApi, useApi, getAuthHeaders } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { formatDate } from '@/lib/utils/dateFormat'
import type { CheckNote } from '@/types'

type Account = { id: string; code: string; name: string; type: string }

const TYPE_LABELS: Record<string, string> = { check: 'Çek', promissory_note: 'Senet' }
const DIRECTION_LABELS: Record<string, string> = { received: 'Alındığı cari', given: 'Verildiği cari' }
const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  given: 'Verildi',
  collected: 'Tahsil edildi',
  bounced: 'Karşılıksız',
  cancelled: 'İptal',
}

function daysUntilDue(dueDate: string): number | null {
  if (!dueDate) return null
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function ChecksNotesPage() {
  const searchParams = useSearchParams()
  const [filterType, setFilterType] = useState<string>('')
  const [filterDirection, setFilterDirection] = useState<string>('')
  const [filterAccountId, setFilterAccountId] = useState<string>('')
  const [filterOverdue, setFilterOverdue] = useState<boolean>(() => searchParams.get('overdue') === '1')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ given_to: string; given_at: string; status: string; given_to_account_id: string }>({ given_to: '', given_at: '', status: 'pending', given_to_account_id: '' })
  const [showGivenToSuggestions, setShowGivenToSuggestions] = useState(false)
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const [accountSearchTerm, setAccountSearchTerm] = useState('')
  const accountDropdownRef = useRef<HTMLDivElement>(null)
  const accountSearchInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    type: 'check' as 'check' | 'promissory_note',
    direction: 'received' as 'received' | 'given',
    account_id: '',
    amount: '',
    currency: 'TRY',
    issue_date: '',
    due_date: '',
    bank_name: '',
    check_or_note_number: '',
    status: 'pending',
    notes: '',
  })

  const listUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (filterType) params.set('type', filterType)
    if (filterDirection) params.set('direction', filterDirection)
    if (filterAccountId) params.set('account_id', filterAccountId)
    if (filterOverdue) params.set('overdue', '1')
    const q = params.toString()
    return `/api/checks-notes${q ? `?${q}` : ''}`
  }, [filterType, filterDirection, filterAccountId, filterOverdue])

  const { data: listData, isLoading, mutate } = useApi<CheckNote[]>(listUrl)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState<Error | null>(null)

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true)
    setAccountsError(null)
    try {
      const res = await fetch('/api/accounts?limit=500&offset=0', {
        credentials: 'include',
        headers: getAuthHeaders(),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = json?.error ?? res.statusText ?? 'Cari listesi alınamadı'
        const err = new Error(typeof msg === 'string' ? msg : 'Cari listesi alınamadı') as Error & { status?: number }
        err.status = res.status
        throw err
      }
      const list = Array.isArray(json?.data) ? json.data : (Array.isArray(json?.list) ? json.list : (Array.isArray(json) ? json : []))
      setAccounts(list)
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Cari listesi yüklenemedi')
      setAccountsError(err)
      setAccounts([])
    } finally {
      setAccountsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const mutateAccounts = useCallback(() => {
    loadAccounts()
  }, [loadAccounts])

  const items = useMemo(() => listData ?? [], [listData])

  const givenToSuggestions = useMemo(() => {
    const q = (editForm.given_to || '').trim().toLowerCase()
    if (!q) return accounts.slice(0, 10)
    return accounts.filter(
      (a) =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.code || '').toLowerCase().includes(q)
    ).slice(0, 10)
  }, [accounts, editForm.given_to])

  const filteredAccountsForForm = useMemo(() => {
    const q = (accountSearchTerm || '').trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter(
      (a) =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.code || '').toLowerCase().includes(q)
    )
  }, [accounts, accountSearchTerm])

  useEffect(() => {
    if (form.due_date) return
    const today = new Date().toISOString().split('T')[0]
    setForm((prev) => ({ ...prev, due_date: today, issue_date: today }))
  }, [form.due_date, form.issue_date])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setShowAccountDropdown(false)
        setAccountSearchTerm('')
      }
    }
    if (showAccountDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAccountDropdown])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.account_id || !form.amount || !form.due_date) {
      toast.warning('Cari hesap, tutar ve vade tarihi zorunludur')
      return
    }
    setSaving(true)
    try {
      await fetchApi('/api/checks-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          direction: form.direction,
          account_id: form.account_id,
          amount: Number(form.amount),
          currency: form.currency,
          issue_date: form.issue_date || null,
          due_date: form.due_date,
          bank_name: form.bank_name || null,
          check_or_note_number: form.check_or_note_number || null,
          status: form.status,
          notes: form.notes || null,
        }),
      })
      setForm({
        type: 'check',
        direction: 'received',
        account_id: '',
        amount: '',
        currency: 'TRY',
        issue_date: '',
        due_date: '',
        bank_name: '',
        check_or_note_number: '',
        status: 'pending',
        notes: '',
      })
      await mutate()
      toast.success('Çek/senet kaydedildi')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kayıt başarısız'
      if (msg.includes('Cari hesap bulunamadı')) {
        setForm((prev) => ({ ...prev, account_id: '' }))
        mutateAccounts()
        toast.error('Seçtiğiniz cari artık mevcut değil (silinmiş olabilir). Lütfen listeden tekrar cari seçin.')
      } else {
        toast.error('Hata: ' + msg)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return
    try {
      await fetchApi(`/api/checks-notes/${id}`, { method: 'DELETE' })
      await mutate()
      toast.success('Kayıt silindi')
    } catch (err: unknown) {
      toast.error('Hata: ' + (err instanceof Error ? err.message : 'Silinemedi'))
    }
  }

  function openEdit(row: CheckNote) {
    setEditId(row.id)
    const today = new Date().toISOString().split('T')[0]
    setEditForm({
      given_to: row.given_to ?? '',
      given_at: row.given_at ? row.given_at.split('T')[0] : today,
      status: row.status || 'pending',
      given_to_account_id: row.given_to_account_id ?? '',
    })
    setShowGivenToSuggestions(false)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    setSaving(true)
    try {
      await fetchApi(`/api/checks-notes/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          given_to: editForm.given_to.trim() || null,
          given_at: editForm.given_at || null,
          status: editForm.status,
          given_to_account_id: editForm.given_to_account_id.trim() || null,
        }),
      })
      setEditId(null)
      await mutate()
      toast.success('Kayıt güncellendi')
    } catch (err: unknown) {
      toast.error('Hata: ' + (err instanceof Error ? err.message : 'Güncellenemedi'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Çek ve Senet</h1>
            <LogoWithBackground size="sm" />
          </div>
          <p className="text-gray-400 mt-1">Alındığı ve verildiği cariye göre çek/senet takibi</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6 space-y-4">
        <h2 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Yeni Çek / Senet Ekle</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Yön <span className="text-red-400">*</span></label>
            <select
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value as 'received' | 'given' })}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            >
              <option value="received">Alındığı cari</option>
              <option value="given">Verildiği cari</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Cari hesap <span className="text-red-400">*</span></label>
            <div className="flex gap-2" ref={accountDropdownRef}>
              <div className="flex-1 relative">
                <input type="hidden" name="account_id" value={form.account_id} />
                <button
                  type="button"
                  onClick={() => {
                    mutateAccounts()
                    if (!accountsLoading && accounts.length > 0) {
                      setShowAccountDropdown((v) => !v)
                      setAccountSearchTerm('')
                      if (!showAccountDropdown) setTimeout(() => accountSearchInputRef.current?.focus(), 50)
                    }
                  }}
                  disabled={accountsLoading}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg disabled:opacity-70 text-left flex items-center justify-between gap-2"
                >
                  <span className="truncate">
                    {accountsLoading
                      ? 'Cariler yükleniyor...'
                      : accounts.length === 0
                        ? 'Cari yok — yenile veya aşağıdaki linkten ekleyin'
                        : form.account_id
                          ? (() => {
                              const a = accounts.find((x) => x.id === form.account_id)
                              return a ? `${a.code} - ${a.name}` : 'Cari seçin'
                            })()
                          : 'Cari seçin'}
                  </span>
                  <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${showAccountDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showAccountDropdown && accounts.length > 0 && (
                  <div className="absolute z-[100] mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-gray-600 sticky top-0 bg-gray-800">
                      <input
                        ref={accountSearchInputRef}
                        type="text"
                        autoComplete="off"
                        value={accountSearchTerm}
                        onChange={(e) => setAccountSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="Cari adı veya kodu yazarak ara..."
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white text-sm rounded placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <ul
                      className="max-h-52 overflow-y-auto py-1"
                      role="listbox"
                    >
                      {filteredAccountsForForm.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-gray-400">Eşleşen cari yok</li>
                      ) : (
                        filteredAccountsForForm.map((a) => (
                          <li
                            key={a.id}
                            role="option"
                            aria-selected={form.account_id === a.id}
                            onClick={() => {
                              setForm((prev) => ({ ...prev, account_id: a.id }))
                              setShowAccountDropdown(false)
                              setAccountSearchTerm('')
                            }}
                            className={`px-4 py-2 cursor-pointer text-sm hover:bg-gray-700 ${form.account_id === a.id ? 'bg-gray-700 text-white' : 'text-gray-200'}`}
                          >
                            {a.code} - {a.name}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => mutateAccounts()}
                disabled={accountsLoading}
                title="Cari listesini yenile"
                className="shrink-0 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50"
              >
                <RefreshCw size={18} />
              </button>
            </div>
            {accountsError && (
              <p className="mt-1 text-sm text-amber-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                {(accountsError as Error & { status?: number }).status === 401 ? (
                  <>
                    Oturum süreniz dolmuş veya giriş yapılmamış. Carileri görmek için{' '}
                    <Link href="/auth/login" className="underline hover:text-amber-300 font-medium">
                      tekrar giriş yapın
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Cari listesi yüklenemedi.
                    <button type="button" onClick={() => mutateAccounts()} className="underline hover:text-amber-300 inline-flex items-center gap-1">
                      <RefreshCw size={14} /> Yenile
                    </button>
                  </>
                )}
              </p>
            )}
            {!accountsLoading && !accountsError && accounts.length === 0 && (
              <p className="mt-1 text-sm text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                <button type="button" onClick={() => mutateAccounts()} className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300">
                  <RefreshCw size={14} /> Carileri yenile
                </button>
                <Link href="/accounts" className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300">
                  <Users size={14} /> Cari Hesaplar sayfasından cari ekleyin
                </Link>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tip <span className="text-red-400">*</span></label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'check' | 'promissory_note' })}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            >
              <option value="check">Çek</option>
              <option value="promissory_note">Senet</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tutar <span className="text-red-400">*</span></label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Düzenleme tarihi</label>
            <input
              type="date"
              value={form.issue_date}
              onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Vade tarihi <span className="text-red-400">*</span></label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Banka</label>
            <input
              type="text"
              value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="Banka adı"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Çek/Senet no</label>
            <input
              type="text"
              value={form.check_or_note_number}
              onChange={(e) => setForm({ ...form, check_or_note_number: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="No"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Durum</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Not</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Plus size={18} />
            {saving ? 'Kaydediliyor...' : 'Ekle'}
          </button>
        </div>
      </form>

      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Filtrele</h3>
        <div className="flex flex-wrap gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm"
          >
            <option value="">Tüm tipler</option>
            <option value="check">Çek</option>
            <option value="promissory_note">Senet</option>
          </select>
          <select
            value={filterDirection}
            onChange={(e) => setFilterDirection(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm"
          >
            <option value="">Tüm yönler</option>
            <option value="received">Alındığı cari</option>
            <option value="given">Verildiği cari</option>
          </select>
          <select
            value={filterAccountId}
            onChange={(e) => setFilterAccountId(e.target.value)}
            onFocus={() => mutateAccounts()}
            className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm min-w-[200px]"
          >
            <option value="">Tüm cariler</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 cursor-pointer hover:bg-gray-700/80">
            <input
              type="checkbox"
              checked={filterOverdue}
              onChange={(e) => setFilterOverdue(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-300">Vadesi geçmiş</span>
          </label>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Kayıtlar</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Henüz çek/senet kaydı yok"
            description="Yukarıdaki form ile alındığı veya verildiği cariye göre çek/senet ekleyebilirsiniz."
            icon={FileText}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cari</TableHead>
                  <TableHead>Yön</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Vade</TableHead>
                  <TableHead>Kalan Gün</TableHead>
                  <TableHead>Banka</TableHead>
                  <TableHead>No</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Verildiği Yer</TableHead>
                  <TableHead>Verildiği Tarih</TableHead>
                  <TableHead className="w-24">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <span className={row.direction === 'received' ? 'text-green-300' : 'text-red-300'}>
                        {row.account_code ? `${row.account_code} - ${row.account_name}` : row.account_name || '-'}
                      </span>
                      <span className={`ml-1.5 inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${row.direction === 'received' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                        {row.direction === 'received' ? 'Alacaklı' : 'Borçlu'}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {DIRECTION_LABELS[row.direction] ?? row.direction}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {TYPE_LABELS[row.type] ?? row.type}
                    </TableCell>
                    <TableCell className="text-gray-200 font-semibold">
                      {Number(row.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {row.currency}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {formatDate(row.due_date)}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {(() => {
                        const days = daysUntilDue(row.due_date)
                        if (days === null) return '-'
                        if (days < 0) return <span className="text-red-400">{days} gün geçti</span>
                        if (days === 0) return <span className="text-amber-400">Bugün</span>
                        return `${days} gün`
                      })()}
                    </TableCell>
                    <TableCell className="text-gray-400">{row.bank_name || '-'}</TableCell>
                    <TableCell className="text-gray-400 font-mono text-sm">{row.check_or_note_number || '-'}</TableCell>
                    <TableCell className="text-gray-300">
                      {STATUS_LABELS[row.status] ?? row.status}
                    </TableCell>
                    <TableCell>
                      {row.given_to ? (
                        <span className="text-red-300">
                          {row.given_to}
                          <span className="ml-1.5 inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-red-900/50 text-red-300">Borçlu</span>
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-300">{row.given_at ? formatDate(row.given_at) : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="p-2 text-blue-400 hover:bg-blue-900/30 rounded"
                          title="Düzenle"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          className="p-2 text-red-400 hover:bg-red-900/30 rounded"
                          title="Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setEditId(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Çek/Senet Düzenle</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Durum</label>
                <select
                  value={editForm.status}
                  onChange={(e) => {
                    const v = e.target.value
                    setEditForm((prev) => {
                      const next = { ...prev, status: v }
                      if (v === 'given' && !prev.given_at) {
                        next.given_at = new Date().toISOString().split('T')[0]
                      }
                      return next
                    })
                  }}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-1">Verildiği Yer (cari)</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={editForm.given_to}
                  onChange={(e) => {
                    setEditForm((prev) => ({ ...prev, given_to: e.target.value, given_to_account_id: '' }))
                    setShowGivenToSuggestions(true)
                  }}
                  onFocus={() => setShowGivenToSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowGivenToSuggestions(false), 200)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                  placeholder="Cari adı veya kodu yazın..."
                />
                {showGivenToSuggestions && givenToSuggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-gray-600 bg-gray-800 shadow-lg py-1">
                    {givenToSuggestions.map((a) => (
                      <li
                        key={a.id}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setEditForm((prev) => ({
                            ...prev,
                            given_to: `${a.code} - ${a.name}`,
                            given_to_account_id: a.id,
                          }))
                          setShowGivenToSuggestions(false)
                        }}
                        className="px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 cursor-pointer"
                      >
                        {a.code} - {a.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Verildiği Tarih</label>
                <input
                  type="date"
                  value={editForm.given_at}
                  onChange={(e) => setEditForm({ ...editForm, given_at: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="px-4 py-2 text-gray-300 hover:text-white border border-gray-600 rounded-lg"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
