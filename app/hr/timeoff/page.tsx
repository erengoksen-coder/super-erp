'use client'

import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'

export default function HrTimeoffPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [form, setForm] = useState({
    employee_id: '',
    type: 'annual',
    start_date: '',
    end_date: '',
    total_days: '',
    reason: '',
  })

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [req, emp] = await Promise.all([
      fetchApi('/api/hr/timeoff/requests'),
      fetchApi('/api/hr/employees'),
    ])
    setRequests(req?.requests || [])
    setEmployees(emp?.employees || [])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await fetchApi('/api/hr/timeoff/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: form.employee_id,
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date,
        total_days: Number(form.total_days || 0),
        reason: form.reason || null,
      }),
    })
    setForm({ employee_id: '', type: 'annual', start_date: '', end_date: '', total_days: '', reason: '' })
    await loadAll()
  }

  async function updateStatus(id: string, status: string) {
    await fetchApi(`/api/hr/timeoff/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await loadAll()
  }

  return (
    <div>
      <div className="flex items-center mb-6 space-x-2">
        <Calendar className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Ä°zin Talepleri</h1>
      </div>

      <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
            <option value="">Ã‡alÄ±ÅŸan</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          <select className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="annual">YÄ±llÄ±k</option>
            <option value="sick">Raporlu</option>
            <option value="unpaid">Ãœcretsiz</option>
          </select>
          <input type="date" className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          <input type="date" className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          <input className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" placeholder="GÃ¼n" value={form.total_days} onChange={(e) => setForm({ ...form, total_days: e.target.value })} />
        </div>
        <div className="mt-3 flex justify-between">
          <input className="flex-1 mr-2 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" placeholder="Neden" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <button className="bg-blue-600 text-white px-3 rounded">Ekle</button>
        </div>
      </form>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="text-gray-400">
            <tr>
              <th className="text-left py-2 px-3">Ã‡alÄ±ÅŸan</th>
              <th className="text-left py-2 px-3">Tip</th>
              <th className="text-left py-2 px-3">Tarih</th>
              <th className="text-left py-2 px-3">Durum</th>
              <th className="text-right py-2 px-3">Ä°ÅŸlem</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {requests.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-gray-400 py-6">KayÄ±t yok.</td></tr>
            ) : requests.map((r) => (
              <tr key={r.id} className="border-t border-gray-800">
                <td className="py-2 px-3">{r.full_name || r.employee_id}</td>
                <td className="py-2 px-3">{r.type}</td>
                <td className="py-2 px-3">{r.start_date} â†’ {r.end_date}</td>
                <td className="py-2 px-3">{r.status}</td>
                <td className="py-2 px-3 text-right space-x-2">
                  <button onClick={() => updateStatus(r.id, 'approved')} className="text-emerald-400">Onayla</button>
                  <button onClick={() => updateStatus(r.id, 'rejected')} className="text-red-400">Reddet</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}