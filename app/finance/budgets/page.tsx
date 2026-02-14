'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wallet, Plus, Trash2, BarChart2 } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { formatDate } from '@/lib/utils/dateFormat'

const DEFAULT_COMPANY_ID = 'company_default'

const CATEGORIES = ['Satış', 'Satın alma', 'Personel', 'Genel gider', 'Pazarlama', 'Ar-Ge', 'Diğer']

type BudgetRow = {
  id: string
  company_id: string
  period: string
  category: string
  budgeted_amount: number
  created_at: string
}

type VarianceRow = {
  category: string
  budgeted: number
  actual: number
  variance: number
  variancePercent: number
  status: string
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
}

export default function BudgetsPage() {
  const [list, setList] = useState<BudgetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [form, setForm] = useState({ period: '', category: 'Satış', budgeted_amount: '' })
  const [variance, setVariance] = useState<VarianceRow[]>([])
  const [varianceLoading, setVarianceLoading] = useState(false)
  const [showVariance, setShowVariance] = useState(false)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (periodStart) params.set('period_start', periodStart)
      if (periodEnd) params.set('period_end', periodEnd)
      const data = await fetchApi<BudgetRow[]>(`/api/budgets?${params.toString()}`)
      setList(Array.isArray(data) ? data : [])
    } catch (e: any) {
      toast.error(e?.message || 'Liste yüklenemedi')
      setList([])
    } finally {
      setLoading(false)
    }
  }, [periodStart, periodEnd])

  useEffect(() => {
    loadList()
  }, [loadList])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(form.budgeted_amount)
    if (!form.period || !form.category || !Number.isFinite(amount) || amount < 0) {
      toast.error('Dönem (YYYY-MM), kategori ve tutar girin')
      return
    }
    try {
      await fetchApi('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: form.period,
          category: form.category,
          budgeted_amount: amount,
        }),
      })
      toast.success('Bütçe eklendi')
      setForm((f) => ({ ...f, budgeted_amount: '' }))
      loadList()
    } catch (e: any) {
      toast.error(e?.message || 'Eklenemedi')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu bütçe satırını silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/budgets/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Silinemedi')
      toast.success('Silindi')
      loadList()
    } catch {
      toast.error('Silme hatası')
    }
  }

  async function loadVariance() {
    const start = periodStart || form.period || new Date().toISOString().slice(0, 7)
    const end = periodEnd || form.period || new Date().toISOString().slice(0, 7)
    setVarianceLoading(true)
    setShowVariance(true)
    try {
      const data = await fetchApi<VarianceRow[]>(
        `/api/financial/budget-variance?companyId=${encodeURIComponent(DEFAULT_COMPANY_ID)}&startDate=${start}&endDate=${end}`
      )
      setVariance(Array.isArray(data) ? data : [])
    } catch (e: any) {
      toast.error(e?.message || 'Sapma raporu yüklenemedi')
      setVariance([])
    } finally {
      setVarianceLoading(false)
    }
  }

  return (
    <AppDashboardLayout
      title="Bütçe yönetimi"
      subtitle="Dönem ve kategori bazlı bütçe girişi, bütçe–gerçekleşen sapma raporu"
      icon={Wallet}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Bütçe girişi</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Dönem (YYYY-MM)</label>
                <Input
                  type="month"
                  value={form.period}
                  onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                  required
                  className="w-36 bg-gray-800 text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Kategori</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-40 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-400">Bütçe tutarı (₺)</label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={form.budgeted_amount}
                  onChange={(e) => setForm((f) => ({ ...f, budgeted_amount: e.target.value }))}
                  placeholder="0"
                  required
                  className="w-32 bg-gray-800 text-white"
                />
              </div>
              <Button type="submit">
                <Plus className="mr-2 h-4 w-4" />
                Ekle
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Bütçe listesi</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Dönem:</span>
              <Input
                type="month"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-32 bg-gray-800 text-white"
                placeholder="Başlangıç"
              />
              <span className="text-gray-500">–</span>
              <Input
                type="month"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-32 bg-gray-800 text-white"
                placeholder="Bitiş"
              />
              <Button variant="outline" onClick={loadVariance}>
                <BarChart2 className="mr-2 h-4 w-4" />
                Sapma raporu
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <p className="text-gray-400">Yükleniyor…</p>
            ) : list.length === 0 ? (
              <p className="text-gray-400">Bütçe satırı yok. Yukarıdan ekleyebilirsiniz.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400">
                      <th className="pb-2 pr-4">Dönem</th>
                      <th className="pb-2 pr-4">Kategori</th>
                      <th className="pb-2 pr-4">Bütçe tutarı</th>
                      <th className="pb-2 pr-4">Kayıt tarihi</th>
                      <th className="pb-2 pr-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.id} className="border-b border-gray-800">
                        <td className="py-2 pr-4 text-white">{r.period}</td>
                        <td className="py-2 pr-4 text-gray-300">{r.category}</td>
                        <td className="py-2 pr-4 text-gray-300">{formatMoney(r.budgeted_amount)}</td>
                        <td className="py-2 pr-4 text-gray-400">{formatDate(r.created_at)}</td>
                        <td className="py-2 pr-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            className="text-red-400 hover:underline"
                            title="Sil"
                          >
                            <Trash2 className="inline h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {showVariance && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Bütçe – gerçekleşen sapma</h2>
            </CardHeader>
            <CardBody>
              {varianceLoading ? (
                <p className="text-gray-400">Yükleniyor…</p>
              ) : variance.length === 0 ? (
                <p className="text-gray-400">Bu dönem için bütçe veya gerçekleşen veri yok.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-400">
                        <th className="pb-2 pr-4">Kategori</th>
                        <th className="pb-2 pr-4">Bütçe</th>
                        <th className="pb-2 pr-4">Gerçekleşen</th>
                        <th className="pb-2 pr-4">Sapma</th>
                        <th className="pb-2 pr-4">Sapma %</th>
                        <th className="pb-2 pr-4">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variance.map((v) => (
                        <tr key={v.category} className="border-b border-gray-800">
                          <td className="py-2 pr-4 font-medium text-white">{v.category}</td>
                          <td className="py-2 pr-4 text-gray-300">{formatMoney(v.budgeted)}</td>
                          <td className="py-2 pr-4 text-gray-300">{formatMoney(v.actual)}</td>
                          <td className="py-2 pr-4 text-gray-300">{formatMoney(v.variance)}</td>
                          <td className="py-2 pr-4 text-gray-300">%{v.variancePercent.toFixed(1)}</td>
                          <td className="py-2 pr-4">
                            <span
                              className={
                                v.status === 'favorable'
                                  ? 'text-green-400'
                                  : v.status === 'unfavorable'
                                    ? 'text-red-400'
                                    : 'text-gray-400'
                              }
                            >
                              {v.status === 'favorable' ? 'Olumlu' : v.status === 'unfavorable' ? 'Olumsuz' : 'Hedefte'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </AppDashboardLayout>
  )
}
