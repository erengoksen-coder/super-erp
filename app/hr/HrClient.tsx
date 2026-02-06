'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { fetchApi } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { toast } from '@/lib/notify'
import { Eye, Users, Building2, Briefcase, Calendar, Clock, User, QrCode, X, Download } from 'lucide-react'
import { formatDate } from '@/lib/utils/dateFormat'

type Employee = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  status: string | null
  created_at: string
  department_id?: string | null
  department_name?: string | null
  team_id?: string | null
  team_name?: string | null
  workplace_id?: string | null
  workplace_name?: string | null
  title?: string | null
  start_date?: string | null
}

type Department = {
  id: string
  name: string
  description: string | null
  manager_id: string | null
  created_at: string
}

type Team = {
  id: string
  name: string
  department_id: string | null
  leader_id: string | null
  created_at: string
}

type Workplace = {
  id: string
  name: string
  address: string | null
  city: string | null
  country: string | null
  timezone: string | null
  is_active: number
  created_at: string
}

export default function HrClient() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [workplaces, setWorkplaces] = useState<Workplace[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<{
    active_employees: number
    departments: number
    open_positions: number
    pending_leave_requests: number
    pdks_today_clocked_in?: number
    pdks_currently_inside?: number
  } | null>(null)

  const [employeeForm, setEmployeeForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    status: 'active',
    department_id: '',
    team_id: '',
    workplace_id: '',
    title: '',
    start_date: '',
  })
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    description: '',
    manager_id: '',
  })
  const [teamForm, setTeamForm] = useState({
    name: '',
    department_id: '',
    leader_id: '',
  })
  const [workplaceForm, setWorkplaceForm] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    timezone: '',
    is_active: 1,
  })
  const [workplaceQrModal, setWorkplaceQrModal] = useState<Workplace | null>(null)

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [employeeData, departmentData, teamData, workplaceData, dashboardData] = await Promise.all([
        fetchApi<Employee[]>('/api/hr/employees'),
        fetchApi<Department[]>('/api/hr/departments'),
        fetchApi<Team[]>('/api/hr/teams'),
        fetchApi<Workplace[]>('/api/hr/workplaces'),
        fetchApi<{ active_employees: number; departments: number; open_positions: number; pending_leave_requests: number; pdks_today_clocked_in?: number; pdks_currently_inside?: number }>('/api/hr/dashboard').catch(() => null),
      ])
      setEmployees(employeeData)
      setDepartments(departmentData)
      setTeams(teamData)
      setWorkplaces(workplaceData)
      setDashboard(dashboardData ?? null)
    } catch (err: any) {
      setError(err?.message || 'Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function createEmployee() {
    setError(null)
    try {
      await fetchApi('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: employeeForm.full_name,
          email: employeeForm.email || undefined,
          phone: employeeForm.phone || undefined,
          status: employeeForm.status,
          department_id: employeeForm.department_id || undefined,
          team_id: employeeForm.team_id || undefined,
          workplace_id: employeeForm.workplace_id || undefined,
          title: employeeForm.title || undefined,
          start_date: employeeForm.start_date || undefined,
        }),
      })
      toast.success('Çalışan eklendi')
      setEmployeeForm({ full_name: '', email: '', phone: '', status: 'active', department_id: '', team_id: '', workplace_id: '', title: '', start_date: '' })
      await loadAll()
    } catch (err: any) {
      toast.error(err?.message || 'Eklenemedi')
    }
  }

  async function deleteEmployee(id: string) {
    if (!confirm('Çalışan kaydı silinsin mi?')) return
    try {
      await fetchApi(`/api/hr/employees/${id}`, { method: 'DELETE' })
      toast.success('Çalışan kaldırıldı')
      await loadAll()
    } catch (err: any) {
      toast.error(err?.message || 'Silinemedi')
    }
  }

  async function createDepartment() {
    setError(null)
    await fetchApi('/api/hr/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(departmentForm),
    })
    setDepartmentForm({ name: '', description: '', manager_id: '' })
    await loadAll()
  }

  async function deleteDepartment(id: string) {
    if (!confirm('Departman kaydı silinsin mi?')) return
    await fetchApi(`/api/hr/departments/${id}`, { method: 'DELETE' })
    await loadAll()
  }

  async function createTeam() {
    setError(null)
    await fetchApi('/api/hr/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamForm),
    })
    setTeamForm({ name: '', department_id: '', leader_id: '' })
    await loadAll()
  }

  async function deleteTeam(id: string) {
    if (!confirm('Takım kaydı silinsin mi?')) return
    await fetchApi(`/api/hr/teams/${id}`, { method: 'DELETE' })
    await loadAll()
  }

  async function createWorkplace() {
    setError(null)
    await fetchApi('/api/hr/workplaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workplaceForm),
    })
    setWorkplaceForm({
      name: '',
      address: '',
      city: '',
      country: '',
      timezone: '',
      is_active: 1,
    })
    await loadAll()
  }

  async function deleteWorkplace(id: string) {
    if (!confirm('Lokasyon kaydı silinsin mi?')) return
    await fetchApi(`/api/hr/workplaces/${id}`, { method: 'DELETE' })
    await loadAll()
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link href="/hr#employees" className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-blue-500/50 transition">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Users className="w-4 h-4" />
              Aktif çalışan
            </div>
            <div className="text-2xl font-bold text-white">{dashboard.active_employees}</div>
          </Link>
          <Link href="/hr#departments" className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-blue-500/50 transition">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Building2 className="w-4 h-4" />
              Departman
            </div>
            <div className="text-2xl font-bold text-white">{dashboard.departments}</div>
          </Link>
          <Link href="/hr/recruitment" className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-blue-500/50 transition">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Briefcase className="w-4 h-4" />
              Açık pozisyon
            </div>
            <div className="text-2xl font-bold text-white">{dashboard.open_positions}</div>
          </Link>
          <Link href="/hr/leave" className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-blue-500/50 transition">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Calendar className="w-4 h-4" />
              Bekleyen izin
            </div>
            <div className="text-2xl font-bold text-white">{dashboard.pending_leave_requests}</div>
          </Link>
          <Link href="/hr/attendance" className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-blue-500/50 transition">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Bugün giriş yapan
            </div>
            <div className="text-2xl font-bold text-white">{dashboard.pdks_today_clocked_in ?? 0}</div>
          </Link>
          <Link href="/hr/attendance" className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-blue-500/50 transition">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <User className="w-4 h-4" />
              Şu an içeride
            </div>
            <div className="text-2xl font-bold text-green-400">{dashboard.pdks_currently_inside ?? 0}</div>
          </Link>
        </div>
      )}

      <Card className="bg-gray-900 border border-gray-800" id="employees">
        <CardHeader title="Çalışanlar" subtitle="Personel kayıtları" />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Ad Soyad"
              value={employeeForm.full_name}
              onChange={(e) => setEmployeeForm((prev) => ({ ...prev, full_name: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="E-posta"
              value={employeeForm.email}
              onChange={(e) => setEmployeeForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Telefon"
              value={employeeForm.phone}
              onChange={(e) => setEmployeeForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <select
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              value={employeeForm.department_id}
              onChange={(e) => setEmployeeForm((prev) => ({ ...prev, department_id: e.target.value }))}
            >
              <option value="">Departman</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              value={employeeForm.team_id}
              onChange={(e) => setEmployeeForm((prev) => ({ ...prev, team_id: e.target.value }))}
            >
              <option value="">Takım</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              value={employeeForm.workplace_id}
              onChange={(e) => setEmployeeForm((prev) => ({ ...prev, workplace_id: e.target.value }))}
            >
              <option value="">İşyeri</option>
              {workplaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Unvan"
              value={employeeForm.title}
              onChange={(e) => setEmployeeForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <input
              type="date"
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              value={employeeForm.start_date}
              onChange={(e) => setEmployeeForm((prev) => ({ ...prev, start_date: e.target.value }))}
              title="İşe başlama"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={createEmployee} disabled={loading || !employeeForm.full_name.trim()}>
              Çalışan Ekle
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-2">Ad Soyad</th>
                  <th className="py-2">E-posta</th>
                  <th className="py-2">Telefon</th>
                  <th className="py-2">Departman</th>
                  <th className="py-2">Takım</th>
                  <th className="py-2">İşyeri</th>
                  <th className="py-2">Unvan</th>
                  <th className="py-2">İşe başlama</th>
                  <th className="py-2">Durum</th>
                  <th className="py-2 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-t border-gray-800 text-gray-200">
                    <td className="py-2">
                      <Link href={`/hr/employees/${employee.id}`} className="text-blue-400 hover:text-blue-300 font-medium">
                        {employee.full_name}
                      </Link>
                    </td>
                    <td className="py-2">{employee.email || '-'}</td>
                    <td className="py-2">{employee.phone || '-'}</td>
                    <td className="py-2">{employee.department_name || '-'}</td>
                    <td className="py-2">{employee.team_name || '-'}</td>
                    <td className="py-2">{employee.workplace_name || '-'}</td>
                    <td className="py-2">{employee.title || '-'}</td>
                    <td className="py-2">{formatDate(employee.start_date)}</td>
                    <td className="py-2">{employee.status || '-'}</td>
                    <td className="py-2 text-right flex items-center justify-end gap-1">
                      <Link
                        href={`/hr/employees/${employee.id}`}
                        className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detay
                      </Link>
                      <Button
                        variant="ghost"
                        color="error"
                        size="sm"
                        onClick={() => deleteEmployee(employee.id)}
                      >
                        Sil
                      </Button>
                    </td>
                  </tr>
                ))}
                {!employees.length && (
                  <tr>
                    <td colSpan={10} className="py-4 text-center text-gray-400">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-gray-900 border border-gray-800" id="departments">
          <CardHeader title="Departmanlar" subtitle="Organizasyon birimleri" />
          <CardBody className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="Departman"
                value={departmentForm.name}
                onChange={(e) => setDepartmentForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="Açıklama"
                value={departmentForm.description}
                onChange={(e) => setDepartmentForm((prev) => ({ ...prev, description: e.target.value }))}
              />
              <Button onClick={createDepartment} disabled={loading || !departmentForm.name.trim()}>
                Departman Ekle
              </Button>
            </div>
            <ul className="space-y-2 text-sm text-gray-200">
              {departments.map((department) => (
                <li key={department.id} className="flex items-center justify-between border-b border-gray-800 py-2">
                  <div>
                    <p className="font-medium text-gray-200">{department.name}</p>
                    <p className="text-xs text-gray-400">{department.description || 'Açıklama yok'}</p>
                  </div>
                  <Button
                    variant="ghost"
                    color="error"
                    size="sm"
                    onClick={() => deleteDepartment(department.id)}
                  >
                    Sil
                  </Button>
                </li>
              ))}
              {!departments.length && <li className="text-gray-400">Kayıt bulunamadı.</li>}
            </ul>
          </CardBody>
        </Card>

        <Card className="bg-gray-900 border border-gray-800">
          <CardHeader title="Takımlar" subtitle="Departman içi ekipler" />
          <CardBody className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="Takım"
                value={teamForm.name}
                onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                placeholder="Departman ID"
                value={teamForm.department_id}
                onChange={(e) => setTeamForm((prev) => ({ ...prev, department_id: e.target.value }))}
              />
              <Button onClick={createTeam} disabled={loading || !teamForm.name.trim()}>
                Takım Ekle
              </Button>
            </div>
            <ul className="space-y-2 text-sm text-gray-200">
              {teams.map((team) => (
                <li key={team.id} className="flex items-center justify-between border-b border-gray-800 py-2">
                  <div>
                    <p className="font-medium text-gray-200">{team.name}</p>
                    <p className="text-xs text-gray-400">Departman: {team.department_id || '-'}</p>
                  </div>
                  <Button
                    variant="ghost"
                    color="error"
                    size="sm"
                    onClick={() => deleteTeam(team.id)}
                  >
                    Sil
                  </Button>
                </li>
              ))}
              {!teams.length && <li className="text-gray-400">Kayıt bulunamadı.</li>}
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader title="Lokasyonlar" subtitle="İşyeri / Şube kayıtları" />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Lokasyon adı"
              value={workplaceForm.name}
              onChange={(e) => setWorkplaceForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Şehir"
              value={workplaceForm.city}
              onChange={(e) => setWorkplaceForm((prev) => ({ ...prev, city: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Ülke"
              value={workplaceForm.country}
              onChange={(e) => setWorkplaceForm((prev) => ({ ...prev, country: e.target.value }))}
            />
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Zaman dilimi"
              value={workplaceForm.timezone}
              onChange={(e) => setWorkplaceForm((prev) => ({ ...prev, timezone: e.target.value }))}
            />
            <Button onClick={createWorkplace} disabled={loading || !workplaceForm.name.trim()}>
              Lokasyon Ekle
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-400"
              placeholder="Adres"
              value={workplaceForm.address}
              onChange={(e) => setWorkplaceForm((prev) => ({ ...prev, address: e.target.value }))}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-2">Lokasyon</th>
                  <th className="py-2">Şehir</th>
                  <th className="py-2">Ülke</th>
                  <th className="py-2">Zaman Dilimi</th>
                  <th className="py-2">Puantaj QR</th>
                  <th className="py-2 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {workplaces.map((workplace) => (
                  <tr key={workplace.id} className="border-t border-gray-800 text-gray-200">
                    <td className="py-2">{workplace.name}</td>
                    <td className="py-2">{workplace.city || '-'}</td>
                    <td className="py-2">{workplace.country || '-'}</td>
                    <td className="py-2">{workplace.timezone || '-'}</td>
                    <td className="py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setWorkplaceQrModal(workplace)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <QrCode className="w-4 h-4 mr-1 inline" />
                        QR al
                      </Button>
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        color="error"
                        size="sm"
                        onClick={() => deleteWorkplace(workplace.id)}
                      >
                        Sil
                      </Button>
                    </td>
                  </tr>
                ))}
                {!workplaces.length && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-gray-400">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Puantaj QR modal */}
      {workplaceQrModal && (() => {
        const clockUrl = typeof window !== 'undefined' ? `${window.location.origin}/hr/clock?location=${encodeURIComponent(workplaceQrModal.id)}` : ''
        const downloadUrl = `/api/hr/clock-qr?location=${encodeURIComponent(workplaceQrModal.id)}`
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setWorkplaceQrModal(null)}>
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Puantaj QR — {workplaceQrModal.name}</h3>
                <button type="button" className="text-gray-400 hover:text-white" onClick={() => setWorkplaceQrModal(null)} aria-label="Kapat">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-400 mb-3">Bu QR’ı bu lokasyona yapıştırın. Çalışanlar okutunca giriş/çıkış sayfası açılır.</p>
              <div className="flex justify-center mb-4 p-4 bg-white rounded-lg">
                <QRCodeSVG value={clockUrl} size={200} level="M" />
              </div>
              <div className="space-y-2 text-xs text-gray-500 break-all mb-4">
                <span className="block text-gray-400">Link:</span>
                <code className="block bg-gray-800 px-2 py-1 rounded">{clockUrl}</code>
              </div>
              <div className="flex gap-2">
                <a
                  href={downloadUrl}
                  download={`puantaj-qr-${workplaceQrModal.name.replace(/\s+/g, '-')}.png`}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500"
                >
                  <Download className="w-4 h-4" />
                  QR görselini indir
                </a>
                <Button variant="ghost" size="sm" onClick={() => setWorkplaceQrModal(null)}>
                  Kapat
                </Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
