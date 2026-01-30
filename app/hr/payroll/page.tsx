'use client'

import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'

export default function HrPayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [form, setForm] = useState({
    employee_id: '',
    period_start: '',
    period_end: '',
    net_pay: '',
  })

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [p, e] = await Promise.all([
      fetchApi('/api/hr/payrolls'),
      fetchApi('/api/hr/employees'),
    ])
    setPayrolls(p?.payrolls || [])
    setEmployees(e?.employees || [])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await fetchApi('/api/hr/payrolls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: form.employee_id,
        period_start: form.period_start,
        period_end: form.period_end,
        net_pay: Number(form.net_pay || 0),
      }),
    })
    setForm({ employee_id: '', period_start: '', period_end: '', net_pay: '' })
    await loadAll()
  }

  return (
    <div>
      <div className="flex items-center mb-6 space-x-2">
        <Wallet className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Bordro</h1>
      </div>

      <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
            <option value="">Çalışan</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          <input type="date" className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
          <input type="date" className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
          <input className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" placeholder="Net" value={form.net_pay} onChange={(e) => setForm({ ...form, net_pay: e.target.value })} />
        </div>
        <div className="mt-3 text-right">
          <button className="bg-blue-600 text-white px-3 py-1 rounded">Ekle</button>
        </div>
      </form>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="text-gray-400">
            <tr>
              <th className="text-left py-2 px-3">Çalışan</th>
              <th className="text-left py-2 px-3">Dönem</th>
              <th className="text-right py-2 px-3">Net</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {payrolls.length === 0 ? (
              <tr><td colSpan={3} className="text-center text-gray-400 py-6">Kayıt yok.</td></tr>
            ) : payrolls.map((p) => (
              <tr key={p.id} className="border-t border-gray-800">
                <td className="py-2 px-3">{p.full_name || p.employee_id}</td>
                <td className="py-2 px-3">{p.period_start} → {p.period_end}</td>
                <td className="py-2 px-3 text-right">{p.net_pay}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
