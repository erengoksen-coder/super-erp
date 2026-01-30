'use client'

import { useEffect, useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'

export default function HrAttendancePage() {
  const [records, setRecords] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [form, setForm] = useState({
    employee_id: '',
    date: '',
    check_in: '',
    check_out: '',
    break_minutes: '0',
    notes: '',
  })

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const [rec, emp] = await Promise.all([
      fetchApi('/api/hr/attendance/records'),
      fetchApi('/api/hr/employees'),
    ])
    setRecords(rec?.records || [])
    setEmployees(emp?.employees || [])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await fetchApi('/api/hr/attendance/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: form.employee_id,
        date: form.date,
        check_in: form.check_in || null,
        check_out: form.check_out || null,
        break_minutes: Number(form.break_minutes || 0),
        notes: form.notes || null,
      }),
    })
    setForm({ employee_id: '', date: '', check_in: '', check_out: '', break_minutes: '0', notes: '' })
    await loadAll()
  }

  return (
    <div>
      <div className="flex items-center mb-6 space-x-2">
        <FileSpreadsheet className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Puantaj</h1>
      </div>

      <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
            <option value="">Çalışan</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          <input type="date" className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" placeholder="Giriş (08:00)" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} />
          <input className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" placeholder="Çıkış (18:00)" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} />
          <input className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" placeholder="Mola" value={form.break_minutes} onChange={(e) => setForm({ ...form, break_minutes: e.target.value })} />
          <input className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" placeholder="Not" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="mt-3 text-right">
          <button className="bg-blue-600 text-white px-3 py-1 rounded">Ekle</button>
        </div>
      </form>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="min-w-full text-xs">
          <thead className="text-gray-400">
            <tr>
              <th className="text-left py-2 px-2">Çalışan</th>
              <th className="text-left py-2 px-2">Tarih</th>
              <th className="text-right py-2 px-2">Toplam</th>
              <th className="text-right py-2 px-2">Devamsızlık</th>
              <th className="text-right py-2 px-2">Fazla Mesai</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {records.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-gray-400 py-6">Kayıt yok.</td></tr>
            ) : records.map((r) => (
              <tr key={r.id} className="border-t border-gray-800">
                <td className="py-2 px-2">{r.full_name || r.employee_id}</td>
                <td className="py-2 px-2">{r.date}</td>
                <td className="py-2 px-2 text-right">{r.total_minutes}</td>
                <td className="py-2 px-2 text-right">{r.absence_minutes}</td>
                <td className="py-2 px-2 text-right">{r.overtime_minutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
