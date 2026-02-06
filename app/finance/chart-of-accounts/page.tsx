'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Plus, Search } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { fetchApi, useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'

type ChartAccount = {
  id: string
  code: string
  name: string
  account_type?: string | null
  type?: string | null
  balance?: number | null
  parent_id?: string | null
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: 'Varlık',
  liability: 'Yükümlülük',
  equity: 'Özkaynak',
  revenue: 'Gelir',
  expense: 'Gider',
}

function buildHierarchy(accounts: ChartAccount[]): (ChartAccount & { _indent?: number })[] {
  const byParent = new Map<string, ChartAccount[]>()
  for (const a of accounts) {
    const pid = a.parent_id || ''
    if (!byParent.has(pid)) byParent.set(pid, [])
    byParent.get(pid)!.push(a)
  }
  const sorted: (ChartAccount & { _indent?: number })[] = []
  function visit(parentId: string, indent: number) {
    const children = (byParent.get(parentId) || []).slice()
    children.sort((a, b) => a.code.localeCompare(b.code, 'tr', { numeric: true }))
    for (const a of children) {
      sorted.push({ ...a, _indent: indent })
      visit(a.id, indent + 1)
    }
  }
  visit('', 0)
  if (sorted.length === 0 && accounts.length > 0) return accounts.map((a) => ({ ...a, _indent: 0 }))
  return sorted
}

export default function ChartOfAccountsPage() {
  const { data, isLoading, mutate } = useApi<ChartAccount[]>('/api/accounting/chart-of-accounts')
  const accounts = useMemo(() => data ?? [], [data])
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [form, setForm] = useState({
    code: '',
    name: '',
    account_type: 'asset',
    parent_id: ''
  })

  const filtered = useMemo(() => {
    let list = buildHierarchy(accounts)
    const term = search.trim().toLowerCase()
    if (term) {
      list = list.filter((a) => a.code.toLowerCase().includes(term) || a.name.toLowerCase().includes(term))
    }
    if (filterType !== 'all') {
      const t = (a: ChartAccount) => a.account_type || a.type || ''
      list = list.filter((a) => t(a) === filterType)
    }
    return list
  }, [accounts, search, filterType])

  const displayList = filtered as (ChartAccount & { _indent?: number })[]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim() || !form.name.trim()) {
      toast.warning('Kod ve hesap adı zorunludur')
      return
    }
    setSaving(true)
    try {
      await fetchApi('/api/accounting/chart-of-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          account_type: form.account_type,
          parent_id: form.parent_id || null
        })
      })
      toast.success('Hesap eklendi')
      setForm({ code: '', name: '', account_type: 'asset', parent_id: '' })
      await mutate()
    } catch (error: any) {
      toast.error(error.message || 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppDashboardLayout title="Hesap Planı" subtitle="Hesap kodları ve bakiyeler" icon={BookOpen}>
      <div className="mb-6">
        <Link href="/finance" className="text-blue-400 hover:text-blue-300 text-sm">← Finans</Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Kod</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="100"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Hesap Adı</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
              placeholder="Kasa"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tip</label>
            <select
              value={form.account_type}
              onChange={(e) => setForm({ ...form, account_type: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            >
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Üst Hesap</label>
            <select
              value={form.parent_id}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            >
              <option value="">Yok</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition inline-flex items-center space-x-2 disabled:opacity-50"
          >
            <Plus size={16} />
            <span>{saving ? 'Kaydediliyor...' : 'Hesap Ekle'}</span>
          </button>
        </div>
      </form>

      {/* Arama ve filtre */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kod veya hesap adıyla ara..."
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mr-2">Hesap tipi:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm"
            >
              <option value="all">Tümü</option>
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <PageLoader fullScreen label="Hesap planı yükleniyor..." />
      ) : accounts.length === 0 ? (
        <EmptyState title="Hesap planı boş" description="Yukarıdaki formdan hesap ekleyerek başlayın." />
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800">
                <TableHead className="h-8 w-24">Kod</TableHead>
                <TableHead className="h-8">Hesap Adı</TableHead>
                <TableHead className="h-8">Tip</TableHead>
                <TableHead className="h-8 text-right">Bakiye</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400 text-sm py-8">
                    Arama veya filtreye uygun hesap yok
                  </TableCell>
                </TableRow>
              ) : (
                displayList.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono text-sm text-white">{account.code}</TableCell>
                    <TableCell className="text-white text-sm">
                      <span style={{ paddingLeft: `${(account._indent ?? 0) * 20}px` }}>
                        {account.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {ACCOUNT_TYPE_LABELS[account.account_type || account.type || ''] || account.account_type || account.type || '-'}
                    </TableCell>
                    <TableCell className="text-right text-white text-sm">
                      {(account.balance ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </AppDashboardLayout>
  )
}
