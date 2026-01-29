"use client"

import { useMemo, useState } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { fetchApi, useApi } from '@/lib/api/client'

type ChartAccount = {
  id: string
  code: string
  name: string
  account_type?: string | null
  type?: string | null
  balance?: number | null
  parent_id?: string | null
}

function getIndentLevel(code: string) {
  if (code.length <= 3) return 0
  if (code.length <= 5) return 1
  return 2
}

export default function ChartOfAccountsPage() {
  const { data, isLoading, mutate } = useApi<ChartAccount[]>('/api/accounting/chart-of-accounts')
  const accounts = useMemo(() => data ?? [], [data])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '',
    name: '',
    account_type: 'asset',
    parent_id: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim() || !form.name.trim()) {
      alert('Kod ve hesap adı zorunludur')
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
      setForm({ code: '', name: '', account_type: 'asset', parent_id: '' })
      await mutate()
    } catch (error: any) {
      alert('Hata: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-2">
            <BookOpen className="w-8 h-8" />
            <span>Hesap Planı</span>
          </h1>
          <p className="text-gray-400">Hesap kodları ve bakiyeler</p>
        </div>
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
              <option value="asset">Varlık</option>
              <option value="liability">Yükümlülük</option>
              <option value="equity">Özkaynak</option>
              <option value="revenue">Gelir</option>
              <option value="expense">Gider</option>
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

      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800">
              <TableHead className="h-8">Kod</TableHead>
              <TableHead className="h-8">Hesap Adı</TableHead>
              <TableHead className="h-8">Tip</TableHead>
              <TableHead className="h-8 text-right">Bakiye</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-400 text-xs py-8">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-400 text-xs py-8">
                  Hesap planı bulunamadı
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => {
                const level = getIndentLevel(account.code)
                return (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium text-white text-xs">{account.code}</TableCell>
                    <TableCell className="text-white text-xs">
                      <span style={{ paddingLeft: `${level * 16}px` }}>
                        {account.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {account.account_type || account.type || '-'}
                    </TableCell>
                    <TableCell className="text-right text-white text-xs">
                      {(account.balance ?? 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
