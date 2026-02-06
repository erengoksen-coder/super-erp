'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'

type Shift = {
  id: string
  name: string
  start_time: string
  end_time: string
  break_minutes: number
  working_days: string
  is_active: number
}

type Employee = {
  id: string
  full_name: string
  shift_template_id?: string | null
  shift_name?: string | null
}

const DAY_LABELS: Record<string, string> = {
  '0': 'Paz',
  '1': 'Pzt',
  '2': 'Sal',
  '3': 'Çar',
  '4': 'Per',
  '5': 'Cum',
  '6': 'Cmt',
}

function formatWorkingDays(working_days: string): string {
  if (!working_days) return '—'
  return working_days.split(',').map((d) => DAY_LABELS[d.trim()] || d).join(', ')
}

export default function HrShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '',
    start_time: '09:00',
    end_time: '18:00',
    break_minutes: 60,
    working_days: '1,2,3,4,5',
  })

  function load() {
    setLoading(true)
    Promise.all([
      fetchApi<Shift[]>('/api/hr/shifts'),
      fetchApi<Employee[]>('/api/hr/employees'),
    ])
      .then(([s, e]) => {
        setShifts(s)
        setEmployees(e)
      })
      .catch((err) => toast.error(err?.message || 'Yüklenemedi'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function createShift(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.warning('Vardiya adı girin')
      return
    }
    try {
      await fetchApi('/api/hr/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      toast.success('Vardiya eklendi')
      setForm({ name: '', start_time: '09:00', end_time: '18:00', break_minutes: 60, working_days: '1,2,3,4,5' })
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Eklenemedi')
    }
  }

  async function deleteShift(id: string) {
    if (!confirm('Bu vardiya silinsin mi? Atanan çalışanların vardiyası boşalır.')) return
    try {
      await fetchApi(`/api/hr/shifts/${id}`, { method: 'DELETE' })
      toast.success('Vardiya silindi')
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Silinemedi')
    }
  }

  async function assignShift(employeeId: string, shiftId: string) {
    try {
      await fetchApi(`/api/hr/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_template_id: shiftId || null }),
      })
      toast.success('Vardiya atandı')
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Atanamedi')
    }
  }

  if (loading && shifts.length === 0) {
    return (
      <AppDashboardLayout title="Vardiya" icon={Clock}>
        <PageLoader fullScreen label="Yükleniyor..." />
      </AppDashboardLayout>
    )
  }

  return (
    <AppDashboardLayout
      title="Vardiya Planı"
      subtitle="Mesai şablonları ve çalışan atamaları (PDKS)"
      icon={Clock}
      breadcrumbs={[{ label: 'İnsan Kaynakları', href: '/hr' }, { label: 'Vardiya' }]}
    >
      <div className="space-y-6">
        <div>
          <Link href="/hr" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />
            İnsan Kaynaklarına dön
          </Link>
        </div>

        <Card className="bg-gray-900 border border-gray-800">
          <CardHeader title="Vardiya şablonları" subtitle="Çalışma saatleri ve günleri" />
          <CardBody className="space-y-4">
            <form onSubmit={createShift} className="flex flex-wrap items-end gap-3 p-3 rounded-lg bg-gray-800/50">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Ad</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Örn: Standart"
                  className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm w-36"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Başlangıç</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm w-28"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Bitiş</label>
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm w-28"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Mola (dk)</label>
                <input
                  type="number"
                  min={0}
                  value={form.break_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, break_minutes: Number(e.target.value) || 0 }))}
                  className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm w-20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Çalışma günleri</label>
                <input
                  value={form.working_days}
                  onChange={(e) => setForm((f) => ({ ...f, working_days: e.target.value }))}
                  placeholder="1,2,3,4,5"
                  title="0=Paz, 1=Pzt, ..., 6=Cmt"
                  className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white text-sm w-32"
                />
              </div>
              <Button type="submit" size="sm"><Plus className="w-4 h-4 mr-1" />Ekle</Button>
            </form>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="py-2">Vardiya</th>
                    <th className="py-2">Başlangıç</th>
                    <th className="py-2">Bitiş</th>
                    <th className="py-2">Mola (dk)</th>
                    <th className="py-2">Günler</th>
                    <th className="py-2 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((s) => (
                    <tr key={s.id} className="border-b border-gray-800 text-gray-200">
                      <td className="py-2 font-medium">{s.name}</td>
                      <td className="py-2">{s.start_time}</td>
                      <td className="py-2">{s.end_time}</td>
                      <td className="py-2">{s.break_minutes}</td>
                      <td className="py-2">{formatWorkingDays(s.working_days)}</td>
                      <td className="py-2 text-right">
                        <Button variant="ghost" color="error" size="sm" onClick={() => deleteShift(s.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!shifts.length && (
                    <tr><td colSpan={6} className="py-4 text-center text-gray-400">Vardiya şablonu yok. Yukarıdan ekleyin.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gray-900 border border-gray-800">
          <CardHeader title="Çalışan vardiya ataması" subtitle="Her çalışan için vardiya seçin" />
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-800">
                    <th className="py-2">Çalışan</th>
                    <th className="py-2">Vardiya</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b border-gray-800 text-gray-200">
                      <td className="py-2">{emp.full_name}</td>
                      <td className="py-2">
                        <select
                          value={emp.shift_template_id || ''}
                          onChange={(e) => assignShift(emp.id, e.target.value)}
                          className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-white text-sm min-w-[140px]"
                        >
                          <option value="">— Vardiya seçin —</option>
                          {shifts.map((s) => (
                            <option key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {!employees.length && (
                    <tr><td colSpan={2} className="py-4 text-center text-gray-400">Çalışan yok.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </AppDashboardLayout>
  )
}
