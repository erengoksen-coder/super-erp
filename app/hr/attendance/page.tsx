'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LogIn, LogOut, ArrowLeft, Calendar, User } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'
import { formatDate } from '@/lib/utils/dateFormat'

type AttendanceRow = {
  id: string
  employee_id: string
  employee_name: string
  date: string
  check_in: string | null
  check_out: string | null
  total_minutes: number
  expected_minutes: number
  overtime_minutes: number
  status: string
}

type Employee = { id: string; full_name: string }

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h}s ${min}dk`
}

export default function HrAttendancePage() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [list, setList] = useState<AttendanceRow[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'today' | 'range'>('today')
  const [clockForm, setClockForm] = useState({ employee_id: '', type: 'in' as 'in' | 'out' })
  const [manualForm, setManualForm] = useState({ employee_id: '', date: today, check_in: '', check_out: '' })

  function load() {
    setLoading(true)
    const isRange = tab === 'range'
    const url = isRange
      ? `/api/hr/attendance?start_date=${startDate}&end_date=${endDate}`
      : `/api/hr/attendance?date=${date}`
    fetchApi<AttendanceRow[]>(url)
      .then(setList)
      .catch((err) => toast.error(err?.message || 'Yüklenemedi'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [tab, date, startDate, endDate])

  useEffect(() => {
    fetchApi<Employee[]>('/api/hr/employees')
      .then(setEmployees)
      .catch(() => {})
  }, [])

  async function clockInOut(e: React.FormEvent, forceType?: 'in' | 'out') {
    e.preventDefault()
    const type = forceType ?? clockForm.type
    if (!clockForm.employee_id) {
      toast.warning('Çalışan seçin')
      return
    }
    const targetDate = tab === 'today' ? date : today
    try {
      await fetchApi('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: clockForm.employee_id,
          date: targetDate,
          type,
        }),
      })
      toast.success(type === 'in' ? 'Giriş kaydedildi' : 'Çıkış kaydedildi')
      setClockForm((f) => ({ ...f, employee_id: '' }))
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Kaydedilemedi')
    }
  }

  async function saveManual(e: React.FormEvent) {
    e.preventDefault()
    if (!manualForm.employee_id || !manualForm.date) {
      toast.warning('Çalışan ve tarih seçin')
      return
    }
    try {
      await fetchApi('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: manualForm.employee_id,
          date: manualForm.date,
          check_in: manualForm.check_in || undefined,
          check_out: manualForm.check_out || undefined,
        }),
      })
      toast.success('Kayıt güncellendi')
      setManualForm((f) => ({ ...f, check_in: '', check_out: '' }))
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Kaydedilemedi')
    }
  }

  return (
    <AppDashboardLayout
      title="Devam / Puantaj (PDKS)"
      subtitle="Giriş–çıkış kayıtları ve puantaj"
      icon={LogIn}
      breadcrumbs={[{ label: 'İnsan Kaynakları', href: '/hr' }, { label: 'Devam' }]}
    >
      <div className="space-y-6">
        <div>
          <Link href="/hr" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />
            İnsan Kaynaklarına dön
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2 border-b border-gray-700">
            <button
              type="button"
              onClick={() => setTab('today')}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === 'today' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
              Bugün
            </button>
            <button
              type="button"
              onClick={() => setTab('range')}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === 'range' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
            >
              Tarih aralığı
            </button>
          </div>
          {tab === 'today' && (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm"
            />
          )}
          {tab === 'range' && (
            <>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm" />
              <span className="text-gray-400">–</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm" />
            </>
          )}
        </div>

        <Card className="bg-gray-900 border border-gray-800">
          <CardHeader title="Giriş / Çıkış" subtitle="Çalışan seçip giriş veya çıkış kaydedin" />
          <CardBody>
            <form id="clock-form" onSubmit={clockInOut} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Çalışan</label>
                <select
                  value={clockForm.employee_id}
                  onChange={(e) => setClockForm((f) => ({ ...f, employee_id: e.target.value }))}
                  className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm min-w-[200px]"
                >
                  <option value="">Seçin</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={(e) => clockInOut(e as unknown as React.FormEvent, 'in')} disabled={!clockForm.employee_id}>
                  <LogIn className="w-4 h-4 mr-1" />
                  Giriş
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={(e) => clockInOut(e as unknown as React.FormEvent, 'out')} disabled={!clockForm.employee_id}>
                  <LogOut className="w-4 h-4 mr-1" />
                  Çıkış
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card className="bg-gray-900 border border-gray-800">
          <CardHeader title="Manuel kayıt" subtitle="Eksik veya düzeltme giriş–çıkış" />
          <CardBody>
            <form onSubmit={saveManual} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Çalışan</label>
                <select
                  value={manualForm.employee_id}
                  onChange={(e) => setManualForm((f) => ({ ...f, employee_id: e.target.value }))}
                  className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm min-w-[180px]"
                >
                  <option value="">Seçin</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tarih</label>
                <input
                  type="date"
                  value={manualForm.date}
                  onChange={(e) => setManualForm((f) => ({ ...f, date: e.target.value }))}
                  className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Giriş (saat)</label>
                <input
                  type="time"
                  value={manualForm.check_in}
                  onChange={(e) => setManualForm((f) => ({ ...f, check_in: e.target.value }))}
                  className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm w-28"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Çıkış (saat)</label>
                <input
                  type="time"
                  value={manualForm.check_out}
                  onChange={(e) => setManualForm((f) => ({ ...f, check_out: e.target.value }))}
                  className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm w-28"
                />
              </div>
              <Button type="submit" size="sm">Kaydet</Button>
            </form>
          </CardBody>
        </Card>

        <Card className="bg-gray-900 border border-gray-800">
          <CardHeader
            title={tab === 'today' ? `Puantaj · ${date}` : `Puantaj · ${startDate} – ${endDate}`}
          />
          <CardBody>
            {loading ? (
              <PageLoader label="Yükleniyor..." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-800">
                      <th className="py-2">Çalışan</th>
                      <th className="py-2">Tarih</th>
                      <th className="py-2">Giriş</th>
                      <th className="py-2">Çıkış</th>
                      <th className="py-2 text-right">Çalışılan</th>
                      <th className="py-2 text-right">Fazla mesai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.id} className="border-b border-gray-800 text-gray-200">
                        <td className="py-2">{r.employee_name}</td>
                        <td className="py-2">{formatDate(r.date)}</td>
                        <td className="py-2">{r.check_in || '—'}</td>
                        <td className="py-2">{r.check_out || '—'}</td>
                        <td className="py-2 text-right">{formatMinutes(r.total_minutes)}</td>
                        <td className="py-2 text-right text-amber-400">{r.overtime_minutes ? formatMinutes(r.overtime_minutes) : '—'}</td>
                      </tr>
                    ))}
                    {!list.length && (
                      <tr><td colSpan={6} className="py-4 text-center text-gray-400">Kayıt yok.</td></tr>
                    )}
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
