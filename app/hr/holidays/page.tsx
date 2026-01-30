'use client'

import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'

export default function HrHolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([])
  const [form, setForm] = useState({ date: '', name: '' })

  useEffect(() => {
    loadHolidays()
  }, [])

  async function loadHolidays() {
    const data = await fetchApi('/api/hr/holidays')
    setHolidays(data?.holidays || [])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await fetchApi('/api/hr/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: form.date, name: form.name }),
    })
    setForm({ date: '', name: '' })
    await loadHolidays()
  }

  return (
    <div>
      <div className="flex items-center mb-6 space-x-2">
        <ClipboardList className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Tatiller</h1>
      </div>

      <form onSubmit={submit} className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="date" className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded" placeholder="Tatil adı" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <button className="bg-blue-600 text-white px-3 rounded">Ekle</button>
        </div>
      </form>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="text-gray-400">
            <tr>
              <th className="text-left py-2 px-3">Tarih</th>
              <th className="text-left py-2 px-3">Ad</th>
            </tr>
          </thead>
          <tbody className="text-white">
            {holidays.length === 0 ? (
              <tr><td colSpan={2} className="text-center text-gray-400 py-6">Kayıt yok.</td></tr>
            ) : holidays.map((h) => (
              <tr key={h.id} className="border-t border-gray-800">
                <td className="py-2 px-3">{h.date}</td>
                <td className="py-2 px-3">{h.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
