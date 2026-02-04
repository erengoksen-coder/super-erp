'use client'

import { useEffect, useState } from 'react'
import { fetchApi } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'

type Employee = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  status: string | null
  created_at: string
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

  const [employeeForm, setEmployeeForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    status: 'active',
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

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [employeeData, departmentData, teamData, workplaceData] = await Promise.all([
        fetchApi<Employee[]>('/api/hr/employees'),
        fetchApi<Department[]>('/api/hr/departments'),
        fetchApi<Team[]>('/api/hr/teams'),
        fetchApi<Workplace[]>('/api/hr/workplaces'),
      ])
      setEmployees(employeeData)
      setDepartments(departmentData)
      setTeams(teamData)
      setWorkplaces(workplaceData)
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
    await fetchApi('/api/hr/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employeeForm),
    })
    setEmployeeForm({ full_name: '', email: '', phone: '', status: 'active' })
    await loadAll()
  }

  async function deleteEmployee(id: string) {
    if (!confirm('Çalışan kaydı silinsin mi?')) return
    await fetchApi(`/api/hr/employees/${id}`, { method: 'DELETE' })
    await loadAll()
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

      <Card className="bg-gray-900 border border-gray-800">
        <CardHeader title="Çalışanlar" subtitle="Personel kayıtları" />
        <CardBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
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
                  <th className="py-2">Durum</th>
                  <th className="py-2 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-t border-gray-800 text-gray-200">
                    <td className="py-2">{employee.full_name}</td>
                    <td className="py-2">{employee.email || '-'}</td>
                    <td className="py-2">{employee.phone || '-'}</td>
                    <td className="py-2">{employee.status || '-'}</td>
                    <td className="py-2 text-right">
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
                    <td colSpan={5} className="py-4 text-center text-gray-400">
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
        <Card className="bg-gray-900 border border-gray-800">
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
                    <td colSpan={5} className="py-4 text-center text-gray-400">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
