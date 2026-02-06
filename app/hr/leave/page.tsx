'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, ArrowLeft, Plus, Check, X } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'
import { formatDate } from '@/lib/utils/dateFormat'

type Balance = {
  id: string
  employee_id: string
  employee_name: string
  year: number
  annual_entitlement: number
  carried_over: number
  used: number
  remaining: number
}

type Request = {
  id: string
  employee_id: string
  employee_name: string
  type: string
  start_date: string
  end_date: string
  total_days: number
  status: string
  reason: string | null
  notes: string | null
  created_at: string
}

type Employee = { id: string; full_name: string }

const LEAVE_TYPES: Record<string, string> = {
  annual: 'Yıllık izin',
  sick: 'Hastalık',
  unpaid: 'Ücretsiz',
  other: 'Diğer',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Onay bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
}

export default function HrLeavePage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [balances, setBalances] = useState<Balance[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'requests' | 'balances' | 'new'>('requests')
  const [newForm, setNewForm] = useState({
    employee_id: '',
    type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
    notes: '',
  })
  const [balanceForm, setBalanceForm] = useState({
    employee_id: '',
    annual_entitlement: 14,
    carried_over: 0,
  })

  function load() {
    setLoading(true)
    Promise.all([
      fetchApi<Balance[]>(`/api/hr/timeoff/balances?year=${year}`),
      fetchApi<Request[]>(`/api/hr/timeoff/requests?year=${year}`),
      fetchApi<Employee[]>('/api/hr/employees'),
    ])
      .then(([b, r, e]) => {
        setBalances(b)
        setRequests(r)
        setEmployees(e)
      })
      .catch((err) => toast.error(err?.message || 'Yüklenemedi'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [year])

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!newForm.employee_id || !newForm.start_date || !newForm.end_date) {
      toast.warning('Çalışan ve tarih aralığı seçin')
      return
    }
    try {
      await fetchApi('/api/hr/timeoff/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: newForm.employee_id,
          type: newForm.type,
          start_date: newForm.start_date,
          end_date: newForm.end_date,
          reason: newForm.reason || undefined,
          notes: newForm.notes || undefined,
        }),
      })
      toast.success('İzin talebi oluşturuldu')
      setNewForm({ employee_id: '', type: 'annual', start_date: '', end_date: '', reason: '', notes: '' })
      setTab('requests')
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Talep oluşturulamadı')
    }
  }

  async function addBalance(e: React.FormEvent) {
    e.preventDefault()
    if (!balanceForm.employee_id) {
      toast.warning('Çalışan seçin')
      return
    }
    try {
      await fetchApi('/api/hr/timeoff/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: balanceForm.employee_id,
          year,
          annual_entitlement: balanceForm.annual_entitlement,
          carried_over: balanceForm.carried_over,
        }),
      })
      toast.success('Bakiye güncellendi')
      setBalanceForm((f) => ({ ...f, employee_id: '', annual_entitlement: 14, carried_over: 0 }))
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Bakiye eklenemedi')
    }
  }

  async function updateRequestStatus(id: string, status: 'approved' | 'rejected') {
    try {
      await fetchApi(`/api/hr/timeoff/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      toast.success(status === 'approved' ? 'Talep onaylandı' : 'Talep reddedildi')
      load()
    } catch (err: any) {
      toast.error(err?.message || 'İşlem başarısız')
    }
  }

  const pendingRequests = requests.filter((r) => r.status === 'pending')

  return (
    <AppDashboardLayout
      title="İzin Yönetimi"
      subtitle="İzin talepleri ve bakiyeler"
      icon={Calendar}
      breadcrumbs={[{ label: 'İnsan Kaynakları', href: '/hr' }, { label: 'İzinler' }]}
    >
      <div className="space-y-6">
        <div>
          <Link href="/hr" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />
            İnsan Kaynaklarına dön
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm text-gray-400">Yıl:</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="flex gap-2 border-b border-gray-700">
            {(['requests', 'balances', 'new'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                  tab === t
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {t === 'requests' && 'Talepler'}
                {t === 'balances' && 'Bakiyeler'}
                {t === 'new' && 'Yeni talep'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <PageLoader fullScreen label="Yükleniyor..." />
        ) : (
          <>
            {tab === 'requests' && (
              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader
                  title="İzin talepleri"
                  subtitle={`${year} yılı · Onay bekleyen: ${pendingRequests.length}`}
                />
                <CardBody>
                  {requests.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4">Bu yıla ait talep yok.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400 border-b border-gray-800">
                            <th className="py-2">Çalışan</th>
                            <th className="py-2">Tür</th>
                            <th className="py-2">Başlangıç</th>
                            <th className="py-2">Bitiş</th>
                            <th className="py-2">Gün</th>
                            <th className="py-2">Durum</th>
                            <th className="py-2 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {requests.map((r) => (
                            <tr key={r.id} className="border-b border-gray-800 text-gray-200">
                              <td className="py-2">{r.employee_name}</td>
                              <td className="py-2">{LEAVE_TYPES[r.type] || r.type}</td>
                              <td className="py-2">{formatDate(r.start_date)}</td>
                              <td className="py-2">{formatDate(r.end_date)}</td>
                              <td className="py-2">{r.total_days}</td>
                              <td className="py-2">
                                <span
                                  className={
                                    r.status === 'approved'
                                      ? 'text-green-400'
                                      : r.status === 'rejected'
                                        ? 'text-red-400'
                                        : 'text-amber-400'
                                  }
                                >
                                  {STATUS_LABELS[r.status] || r.status}
                                </span>
                              </td>
                              <td className="py-2 text-right">
                                {r.status === 'pending' && (
                                  <span className="flex gap-1 justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-green-400 hover:text-green-300"
                                      onClick={() => updateRequestStatus(r.id, 'approved')}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-400 hover:text-red-300"
                                      onClick={() => updateRequestStatus(r.id, 'rejected')}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </span>
                                )}
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

            {tab === 'balances' && (
              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader title="İzin bakiyeleri" subtitle={`${year} yılı`} />
                <CardBody className="space-y-4">
                  <form onSubmit={addBalance} className="flex flex-wrap items-end gap-3 p-3 rounded-lg bg-gray-800/50">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Çalışan</label>
                      <select
                        value={balanceForm.employee_id}
                        onChange={(e) => setBalanceForm((f) => ({ ...f, employee_id: e.target.value }))}
                        className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm min-w-[180px]"
                      >
                        <option value="">Seçin</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Yıllık hak (gün)</label>
                      <input
                        type="number"
                        min={0}
                        value={balanceForm.annual_entitlement}
                        onChange={(e) => setBalanceForm((f) => ({ ...f, annual_entitlement: Number(e.target.value) || 0 }))}
                        className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm w-24"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Devir (gün)</label>
                      <input
                        type="number"
                        min={0}
                        value={balanceForm.carried_over}
                        onChange={(e) => setBalanceForm((f) => ({ ...f, carried_over: Number(e.target.value) || 0 }))}
                        className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm w-24"
                      />
                    </div>
                    <Button type="submit" size="sm" disabled={!balanceForm.employee_id}>
                      Bakiye ekle / güncelle
                    </Button>
                  </form>
                  {balances.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4">Bakiye kaydı yok. Yukarıdan çalışan seçip yıllık hak ve devir girerek ekleyin.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-400 border-b border-gray-800">
                            <th className="py-2">Çalışan</th>
                            <th className="py-2">Yıllık hak</th>
                            <th className="py-2">Devir</th>
                            <th className="py-2">Kullanılan</th>
                            <th className="py-2">Kalan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {balances.map((b) => (
                            <tr key={b.id} className="border-b border-gray-800 text-gray-200">
                              <td className="py-2">{b.employee_name}</td>
                              <td className="py-2">{b.annual_entitlement}</td>
                              <td className="py-2">{b.carried_over}</td>
                              <td className="py-2">{b.used}</td>
                              <td className="py-2 font-medium text-green-400">{b.remaining}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {tab === 'new' && (
              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader title="Yeni izin talebi" />
                <CardBody>
                  <form onSubmit={submitRequest} className="space-y-4 max-w-xl">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Çalışan</label>
                      <select
                        required
                        value={newForm.employee_id}
                        onChange={(e) => setNewForm((f) => ({ ...f, employee_id: e.target.value }))}
                        className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                      >
                        <option value="">Seçin</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">İzin türü</label>
                      <select
                        value={newForm.type}
                        onChange={(e) => setNewForm((f) => ({ ...f, type: e.target.value }))}
                        className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                      >
                        {Object.entries(LEAVE_TYPES).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Başlangıç</label>
                        <input
                          type="date"
                          required
                          value={newForm.start_date}
                          onChange={(e) => setNewForm((f) => ({ ...f, start_date: e.target.value }))}
                          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Bitiş</label>
                        <input
                          type="date"
                          required
                          value={newForm.end_date}
                          onChange={(e) => setNewForm((f) => ({ ...f, end_date: e.target.value }))}
                          className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Gerekçe (opsiyonel)</label>
                      <input
                        value={newForm.reason}
                        onChange={(e) => setNewForm((f) => ({ ...f, reason: e.target.value }))}
                        className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Not (opsiyonel)</label>
                      <textarea
                        value={newForm.notes}
                        onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))}
                        className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                        rows={2}
                      />
                    </div>
                    <Button type="submit" disabled={loading}>
                      <Plus className="w-4 h-4 mr-1" />
                      Talep oluştur
                    </Button>
                  </form>
                </CardBody>
              </Card>
            )}
          </>
        )}
      </div>
    </AppDashboardLayout>
  )
}
