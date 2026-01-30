'use client'

import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'

export default function HrOrganizationPage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [workplaces, setWorkplaces] = useState<any[]>([])
  const [deptName, setDeptName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [workplaceName, setWorkplaceName] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [d, t, w] = await Promise.all([
      fetchApi('/api/hr/departments'),
      fetchApi('/api/hr/teams'),
      fetchApi('/api/hr/workplaces'),
    ])
    setDepartments(d?.departments || [])
    setTeams(t?.teams || [])
    setWorkplaces(w?.workplaces || [])
  }

  async function addDepartment() {
    if (!deptName.trim()) return
    await fetchApi('/api/hr/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: deptName }),
    })
    setDeptName('')
    await loadAll()
  }

  async function addTeam() {
    if (!teamName.trim()) return
    await fetchApi('/api/hr/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamName }),
    })
    setTeamName('')
    await loadAll()
  }

  async function addWorkplace() {
    if (!workplaceName.trim()) return
    await fetchApi('/api/hr/workplaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: workplaceName }),
    })
    setWorkplaceName('')
    await loadAll()
  }

  return (
    <div>
      <div className="flex items-center mb-6 space-x-2">
        <Building2 className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Organizasyon</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-white font-medium mb-2">Departmanlar</div>
          <div className="flex space-x-2 mb-2">
            <input className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" placeholder="Departman" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
            <button onClick={addDepartment} className="bg-blue-600 text-white px-3 rounded">Ekle</button>
          </div>
          <div className="text-sm text-gray-300 space-y-1">
            {departments.map((d) => <div key={d.id}>{d.name}</div>)}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-white font-medium mb-2">Ekipler</div>
          <div className="flex space-x-2 mb-2">
            <input className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" placeholder="Ekip" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <button onClick={addTeam} className="bg-blue-600 text-white px-3 rounded">Ekle</button>
          </div>
          <div className="text-sm text-gray-300 space-y-1">
            {teams.map((t) => <div key={t.id}>{t.name}</div>)}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-white font-medium mb-2">Ä°ÅŸyerleri</div>
          <div className="flex space-x-2 mb-2">
            <input className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" placeholder="Ä°ÅŸyeri" value={workplaceName} onChange={(e) => setWorkplaceName(e.target.value)} />
            <button onClick={addWorkplace} className="bg-blue-600 text-white px-3 rounded">Ekle</button>
          </div>
          <div className="text-sm text-gray-300 space-y-1">
            {workplaces.map((w) => <div key={w.id}>{w.name}</div>)}
          </div>
        </div>
      </div>
    </div>
  )
}