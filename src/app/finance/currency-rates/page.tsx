'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Wallet, Plus, RefreshCw, Calendar } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { formatDate } from '@/lib/utils/dateFormat'
import { EmptyState } from '@/components/ui/EmptyState'

type RateRow = {
  id: string
  from_currency: string
  to_currency: string
  rate: number
  rate_date: string
  created_at: string
}

export default function CurrencyRatesPage() {
  const [list, setList] = useState<RateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    from_currency: 'USD',
    to_currency: 'TRY',
    rate: '',
    rate_date: new Date().toISOString().slice(0, 10),
  })
  const [loadingLive, setLoadingLive] = useState(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchApi<RateRow[]>('/api/currency-rates?limit=100')
      setList(Array.isArray(data) ? data : [])
    } catch (e: unknown) {
      toast.error('Kurlar yüklenemedi')
      setList([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  async function fetchLiveRate() {
    if (form.from_currency === form.to_currency) {
      setForm((f) => ({ ...f, rate: '1' }))
      return
    }
    setLoadingLive(true)
    try {
      const res = await fetch(
        `/api/currency-rates/live?from=${encodeURIComponent(form.from_currency)}&to=${encodeURIComponent(form.to_currency)}`
      )
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Anlık kur alınamadı')
        return
      }
      setForm((f) => ({
        ...f,
        rate: String(data.rate),
        rate_date: data.date || f.rate_date,
      }))
      toast.success(`Anlık kur: 1 ${form.from_currency} = ${Number(data.rate).toLocaleString('tr-TR')} ${form.to_currency}`)
    } catch {
      toast.error('Anlık kur alınamadı')
    } finally {
      setLoadingLive(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rate = Number(form.rate)
    if (!Number.isFinite(rate) || rate <= 0) {
      toast.error('Geçerli bir kur girin')
      return
    }
    try {
      await fetchApi('/api/currency-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_currency: form.from_currency,
          to_currency: form.to_currency,
          rate,
          rate_date: form.rate_date,
        }),
      })
      toast.success('Kur eklendi')
      setForm((f) => ({ ...f, rate: '' }))
      loadList()
    } catch (e: unknown) {
      toast.error('Kur eklenemedi')
    }
  }

  const latestByPair = list.reduce((acc, r) => {
    const key = `${r.from_currency}/${r.to_currency}`
    if (!acc[key] || acc[key].rate_date < r.rate_date) acc[key] = r
    return acc
  }, {} as Record<string, RateRow>)

  return (
    <AppDashboardLayout
      title="Kur bilgisi"
      subtitle="Döviz kurları (raporlama ve çevrim için)"
      icon={Wallet}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Kur ekle</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Kaynak para birimi</label>
                <select
                  value={form.from_currency}
                  onChange={(e) => setForm((f) => ({ ...f, from_currency: e.target.value }))}
                  className="w-24 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Hedef para birimi</label>
                <select
                  value={form.to_currency}
                  onChange={(e) => setForm((f) => ({ ...f, to_currency: e.target.value }))}
                  className="w-24 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white"
                >
                  <option value="TRY">TRY</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Kur</label>
                <Input
                  type="number"
                  min={0}
                  step={0.0001}
                  value={form.rate}
                  onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                  placeholder="Örn. 34.50"
                  required
                  className="w-28 bg-gray-800 text-white"
                />
              </div>
              <div className="relative group cursor-pointer" onClick={() => dateInputRef.current?.showPicker()}>
                <label className="mb-1 block text-sm text-gray-400">Tarih</label>
                <Input
                  ref={dateInputRef}
                  type="date"
                  value={form.rate_date}
                  onChange={(e) => setForm((f) => ({ ...f, rate_date: e.target.value }))}
                  className="w-44 bg-gray-800 text-white cursor-pointer pr-10 [&::-webkit-calendar-picker-indicator]:hidden"
                  style={{ colorScheme: 'dark' }}
                />
                <Calendar className="absolute right-3 bottom-2.5 h-4 w-4 text-blue-400 pointer-events-none group-hover:text-blue-300 transition-colors drop-shadow-[0_0_2px_rgba(59,130,246,0.5)]" />
              </div>
              <Button type="submit" disabled={!form.rate.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Ekle
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={fetchLiveRate}
                disabled={loadingLive || form.from_currency === form.to_currency}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingLive ? 'animate-spin' : ''}`} />
                {loadingLive ? 'Getiriliyor…' : 'Anlık kur getir'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Güncel kurlar (son kayıt)</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-4">
              {Object.entries(latestByPair).map(([pair, r]) => (
                <div key={pair} className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2">
                  <span className="text-gray-400">{pair}</span>
                  <span className="ml-2 font-semibold text-white">{Number(r.rate).toLocaleString('tr-TR')}</span>
                  <span className="ml-1 text-xs text-gray-500">{r.rate_date}</span>
                </div>
              ))}
              {Object.keys(latestByPair).length === 0 && !loading && (
                <p className="text-gray-400">Henüz kur kaydı yok. Yukarıdan ekleyebilirsiniz.</p>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Kur geçmişi</h2>
          </CardHeader>
          <CardBody>
            {loading ? (
              <p className="text-gray-400">Yükleniyor…</p>
            ) : list.length === 0 ? (
              <EmptyState
                title="Kayıt yok"
                description="Kur geçmişi burada listelenir."
                icon={Wallet}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400">
                      <th className="pb-2 pr-4">Çevrim</th>
                      <th className="pb-2 pr-4">Kur</th>
                      <th className="pb-2 pr-4">Tarih</th>
                      <th className="pb-2 pr-4">Kayıt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.id} className="border-b border-gray-800">
                        <td className="py-2 pr-4 font-medium text-white">{r.from_currency} → {r.to_currency}</td>
                        <td className="py-2 pr-4 text-gray-300">{Number(r.rate).toLocaleString('tr-TR')}</td>
                        <td className="py-2 pr-4 text-gray-300">{r.rate_date}</td>
                        <td className="py-2 pr-4 text-gray-400">{formatDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </AppDashboardLayout>
  )
}
