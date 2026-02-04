'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchApi } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { useRealtime } from '@/hooks/useRealtime'

type ChartAccount = {
  id: string
  code: string
  name: string
  account_type: string
  parent_id?: string | null
  child_count?: number | null
}

function getAccountTypeLabel(accountType: string): string {
  const typeMap: Record<string, string> = {
    asset: 'Varlık',
    liability: 'Yükümlülük',
    equity: 'Özkaynak',
    revenue: 'Gelir',
    expense: 'Gider',
  }
  return typeMap[accountType] || accountType
}

export default function AccountingClient() {
  const [accounts, setAccounts] = useState<ChartAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    code: '',
    name: '',
    account_type: 'asset',
    parent_id: '',
  })

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // fetchApi zaten ok() formatından data'yı otomatik çıkarıyor
      const data = await fetchApi<ChartAccount[]>('/api/accounting/chart-of-accounts')
      if (Array.isArray(data)) {
        setAccounts(data)
      } else {
        console.warn('Beklenmeyen veri formatı:', data)
        setAccounts([])
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.error || 'Hesap planı yüklenemedi'
      setError(errorMessage)
      console.error('Hesap planı yükleme hatası:', err)
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  useRealtime('chart_of_accounts', () => {
    loadAccounts()
  })

  async function createAccount() {
    setError(null)
    setLoading(true)
    try {
      await fetchApi('/api/accounting/chart-of-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          account_type: form.account_type,
          parent_id: form.parent_id || null,
        }),
      })
      setForm({ code: '', name: '', account_type: 'asset', parent_id: '' })
      await loadAccounts()
    } catch (err: any) {
      setError(err?.message || 'Hesap oluşturulamadı')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/50 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader title="Hesap Planı" subtitle="Muhasebe hesapları ve kodları" />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Kod"
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Hesap adı"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <select
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              value={form.account_type}
              onChange={(e) => setForm((prev) => ({ ...prev, account_type: e.target.value }))}
            >
              <option value="asset">Varlık</option>
              <option value="liability">Yükümlülük</option>
              <option value="equity">Özkaynak</option>
              <option value="revenue">Gelir</option>
              <option value="expense">Gider</option>
            </select>
            <Button
              onClick={createAccount}
              disabled={loading || !form.code.trim() || !form.name.trim()}
            >
              Hesap Ekle
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-2">Kod</th>
                  <th className="py-2">Hesap</th>
                  <th className="py-2">Tip</th>
                  <th className="py-2 text-right">Alt Hesap</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-t border-gray-800 text-gray-200">
                    <td className="py-2 font-mono text-gray-300">{account.code}</td>
                    <td className="py-2 font-medium text-gray-200">{account.name}</td>
                    <td className="py-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700">
                        {getAccountTypeLabel(account.account_type)}
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-400">{account.child_count || 0}</td>
                  </tr>
                ))}
                {!accounts.length && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">
                      Hesap bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader title="Yevmiye Fişleri" subtitle="Kayıtları buradan yönetin" />
        <CardBody>
          <p className="text-sm text-gray-400">
            Yevmiye fişleri entegrasyonu sonraki adımda eklenecek.
          </p>
        </CardBody>
      </Card>

      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader title="Finansal Raporlar" subtitle="Bilanço ve gelir tablosu" />
        <CardBody>
          <p className="text-sm text-gray-400">
            Bilanço ve P&amp;L raporları için veri hazırlığı sürüyor.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
