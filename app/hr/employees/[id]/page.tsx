'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { useApi } from '@/lib/api/client'
import { fetchApi } from '@/lib/api/client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { toast } from '@/lib/notify'
import { PageLoader } from '@/components/ui/PageLoader'
import { formatDate } from '@/lib/utils/dateFormat'

type EmployeeDetail = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  status: string | null
  created_at: string
  profile: {
    department_id: string | null
    department_name: string | null
    team_id: string | null
    team_name: string | null
    workplace_id: string | null
    workplace_name: string | null
    title: string | null
    start_date: string | null
    end_date: string | null
    employment_type: string | null
    manager_id: string | null
    base_salary: number | null
    salary_currency: string | null
    national_id: string | null
    birth_date: string | null
    address: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    annual_leave_days: number | null
    shift_template_id: string | null
    shift_name: string | null
  }
}

type Department = { id: string; name: string }
type Team = { id: string; name: string; department_id: string | null }
type Workplace = { id: string; name: string }
type Shift = { id: string; name: string; start_time: string; end_time: string }

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { data: employee, isLoading, mutate } = useApi<EmployeeDetail>(id ? `/api/hr/employees/${id}` : null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    status: 'active',
    department_id: '',
    team_id: '',
    workplace_id: '',
    title: '',
    start_date: '',
    employment_type: '',
    end_date: '',
    national_id: '',
    birth_date: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    annual_leave_days: 14,
    base_salary: 0,
    shift_template_id: '',
  })

  useEffect(() => {
    if (!employee) return
    setForm({
      full_name: employee.full_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      status: employee.status || 'active',
      department_id: employee.profile?.department_id || '',
      team_id: employee.profile?.team_id || '',
      workplace_id: employee.profile?.workplace_id || '',
      title: employee.profile?.title || '',
      start_date: employee.profile?.start_date?.slice(0, 10) || '',
      employment_type: employee.profile?.employment_type || '',
      end_date: employee.profile?.end_date?.slice(0, 10) || '',
      national_id: employee.profile?.national_id || '',
      birth_date: employee.profile?.birth_date?.slice(0, 10) || '',
      address: employee.profile?.address || '',
      emergency_contact_name: employee.profile?.emergency_contact_name || '',
      emergency_contact_phone: employee.profile?.emergency_contact_phone || '',
      annual_leave_days: employee.profile?.annual_leave_days ?? 14,
      base_salary: employee.profile?.base_salary ?? 0,
      shift_template_id: employee.profile?.shift_template_id || '',
    })
  }, [employee])

  useEffect(() => {
    Promise.all([
      fetchApi<Department[]>('/api/hr/departments'),
      fetchApi<Team[]>('/api/hr/teams'),
      fetchApi<Workplace[]>('/api/hr/workplaces'),
      fetchApi<Shift[]>('/api/hr/shifts'),
    ]).then(([d, t, w, s]) => {
      setDepartments(d)
      setTeams(t)
      setWorkplaces(w)
      setShifts(s)
    }).catch(() => {})
  }, [])

  async function handleSave() {
    if (!id) return
    setSaving(true)
    try {
      await fetchApi(`/api/hr/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          status: form.status || undefined,
          department_id: form.department_id || undefined,
          team_id: form.team_id || undefined,
          workplace_id: form.workplace_id || undefined,
          title: form.title || undefined,
          start_date: form.start_date || undefined,
          employment_type: form.employment_type || undefined,
          end_date: form.end_date || undefined,
          national_id: form.national_id || undefined,
          birth_date: form.birth_date || undefined,
          address: form.address || undefined,
          emergency_contact_name: form.emergency_contact_name || undefined,
          emergency_contact_phone: form.emergency_contact_phone || undefined,
          annual_leave_days: form.annual_leave_days,
          base_salary: form.base_salary,
          shift_template_id: form.shift_template_id || undefined,
        }),
      })
      toast.success('Çalışan güncellendi')
      setEditMode(false)
      mutate()
    } catch (e: any) {
      toast.error(e?.message || 'Güncellenemedi')
    } finally {
      setSaving(false)
    }
  }

  if (!id) {
    return (
      <AppDashboardLayout title="Çalışan" icon={User}>
        <p className="text-gray-400">Geçersiz çalışan.</p>
      </AppDashboardLayout>
    )
  }

  if (isLoading || !employee) {
    return (
      <AppDashboardLayout title="Çalışan" icon={User}>
        <PageLoader fullScreen label="Yükleniyor..." />
      </AppDashboardLayout>
    )
  }

  const p = employee.profile

  return (
    <AppDashboardLayout
      title={employee.full_name}
      subtitle="Çalışan detayı ve düzenleme"
      icon={User}
      breadcrumbs={[
        { label: 'İnsan Kaynakları', href: '/hr' },
        { label: 'Çalışanlar', href: '/hr' },
        { label: employee.full_name },
      ]}
      actions={
        !editMode ? (
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
            Düzenle
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
              İptal
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-6">
        <div>
          <Link href="/hr" className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-2 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />
            İnsan Kaynaklarına dön
          </Link>
        </div>

        {editMode ? (
          <Card className="bg-gray-900 border border-gray-800">
            <CardHeader title="Çalışan bilgileri" />
            <CardBody className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ad Soyad</label>
                  <input
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">E-posta</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Telefon</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Durum</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                    <option value="on_leave">İzinde</option>
                    <option value="terminated">Ayrıldı</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Departman</label>
                  <select
                    value={form.department_id}
                    onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  >
                    <option value="">Seçin</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Takım</label>
                  <select
                    value={form.team_id}
                    onChange={(e) => setForm((f) => ({ ...f, team_id: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  >
                    <option value="">Seçin</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">İşyeri</label>
                  <select
                    value={form.workplace_id}
                    onChange={(e) => setForm((f) => ({ ...f, workplace_id: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  >
                    <option value="">Seçin</option>
                    {workplaces.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Unvan</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                    placeholder="Örn: Yazılım Geliştirici"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">İşe başlama tarihi</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">İstihdam türü</label>
                  <select
                    value={form.employment_type}
                    onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  >
                    <option value="">Seçin</option>
                    <option value="full_time">Tam zamanlı</option>
                    <option value="part_time">Yarı zamanlı</option>
                    <option value="contract">Sözleşmeli</option>
                    <option value="intern">Stajyer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ayrılış tarihi</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">TC Kimlik No</label>
                  <input
                    value={form.national_id}
                    onChange={(e) => setForm((f) => ({ ...f, national_id: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Doğum tarihi</label>
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Adres</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Acil iletişim adı</label>
                  <input
                    value={form.emergency_contact_name}
                    onChange={(e) => setForm((f) => ({ ...f, emergency_contact_name: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Acil iletişim telefon</label>
                  <input
                    value={form.emergency_contact_phone}
                    onChange={(e) => setForm((f) => ({ ...f, emergency_contact_phone: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Yıllık izin hakkı (gün)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.annual_leave_days}
                    onChange={(e) => setForm((f) => ({ ...f, annual_leave_days: Number(e.target.value) || 0 }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Brüt maaş (TRY)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.base_salary}
                    onChange={(e) => setForm((f) => ({ ...f, base_salary: Number(e.target.value) || 0 }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Vardiya</label>
                  <select
                    value={form.shift_template_id}
                    onChange={(e) => setForm((f) => ({ ...f, shift_template_id: e.target.value }))}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                  >
                    <option value="">Seçin</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            <Card className="bg-gray-900 border border-gray-800">
              <CardHeader title="Temel bilgiler" />
              <CardBody>
                <dl className="grid gap-3 md:grid-cols-2 text-sm">
                  <div><dt className="text-gray-400">Ad Soyad</dt><dd className="text-white">{employee.full_name}</dd></div>
                  <div><dt className="text-gray-400">E-posta</dt><dd className="text-white">{employee.email || '—'}</dd></div>
                  <div><dt className="text-gray-400">Telefon</dt><dd className="text-white">{employee.phone || '—'}</dd></div>
                  <div><dt className="text-gray-400">Durum</dt><dd className="text-white">{employee.status || '—'}</dd></div>
                </dl>
              </CardBody>
            </Card>
            <Card className="bg-gray-900 border border-gray-800">
              <CardHeader title="Organizasyon ve iş bilgisi" />
              <CardBody>
                <dl className="grid gap-3 md:grid-cols-2 text-sm">
                  <div><dt className="text-gray-400">Departman</dt><dd className="text-white">{p?.department_name || '—'}</dd></div>
                  <div><dt className="text-gray-400">Takım</dt><dd className="text-white">{p?.team_name || '—'}</dd></div>
                  <div><dt className="text-gray-400">İşyeri</dt><dd className="text-white">{p?.workplace_name || '—'}</dd></div>
                  <div><dt className="text-gray-400">Unvan</dt><dd className="text-white">{p?.title || '—'}</dd></div>
                  <div><dt className="text-gray-400">İşe başlama</dt><dd className="text-white">{p?.start_date ? formatDate(p.start_date) : '—'}</dd></div>
                  <div><dt className="text-gray-400">İstihdam türü</dt><dd className="text-white">{p?.employment_type || '—'}</dd></div>
                  <div><dt className="text-gray-400">Ayrılış tarihi</dt><dd className="text-white">{p?.end_date ? formatDate(p.end_date) : '—'}</dd></div>
                  <div><dt className="text-gray-400">Yıllık izin hakkı</dt><dd className="text-white">{p?.annual_leave_days ?? '—'} gün</dd></div>
                  <div><dt className="text-gray-400">Brüt maaş</dt><dd className="text-white">{p?.base_salary != null ? p.base_salary.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '—'}</dd></div>
                  <div><dt className="text-gray-400">Vardiya</dt><dd className="text-white">{p?.shift_name || '—'}</dd></div>
                </dl>
              </CardBody>
            </Card>
            <Card className="bg-gray-900 border border-gray-800">
              <CardHeader title="Kişisel bilgiler" />
              <CardBody>
                <dl className="grid gap-3 md:grid-cols-2 text-sm">
                  <div><dt className="text-gray-400">TC Kimlik No</dt><dd className="text-white">{p?.national_id ? '***' + (p.national_id).slice(-4) : '—'}</dd></div>
                  <div><dt className="text-gray-400">Doğum tarihi</dt><dd className="text-white">{p?.birth_date ? formatDate(p.birth_date) : '—'}</dd></div>
                  <div className="md:col-span-2"><dt className="text-gray-400">Adres</dt><dd className="text-white">{p?.address || '—'}</dd></div>
                  <div><dt className="text-gray-400">Acil iletişim</dt><dd className="text-white">{p?.emergency_contact_name || '—'} {p?.emergency_contact_phone ? `(${p.emergency_contact_phone})` : ''}</dd></div>
                </dl>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </AppDashboardLayout>
  )
}
