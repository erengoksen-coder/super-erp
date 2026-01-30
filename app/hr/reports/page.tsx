'use client'

import { useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'

type SummaryTotals = {
  employees: number
  active_employees: number
  pending_timeoff: number
  payroll_drafts: number
}

type AttendanceSummaryRow = {
  employee_id: string
  full_name: string
  total_minutes: number
  absence_minutes: number
  overtime_minutes: number
}

type TimeoffSummaryRow = {
  type: string
  status: string
  count: number
}

export default function HrReportsPage() {
  const [totals, setTotals] = useState<SummaryTotals | null>(null)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummaryRow[]>([])
  const [timeoffYear, setTimeoffYear] = useState(() => String(new Date().getFullYear()))
  const [timeoffSummary, setTimeoffSummary] = useState<TimeoffSummaryRow[]>([])
  const [payrollRange, setPayrollRange] = useState({
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
  })
  const [payrollSummary, setPayrollSummary] = useState({ total_net_pay: 0, count: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    loadAttendanceSummary()
  }, [month])

  useEffect(() => {
    loadTimeoffSummary()
  }, [timeoffYear])

  useEffect(() => {
    loadPayrollSummary()
  }, [payrollRange.start_date, payrollRange.end_date])

  async function loadAll() {
    setLoading(true)
    try {
      const data = await fetchApi('/api/hr/reports/summary')
      setTotals(data?.totals || null)
      await Promise.all([loadAttendanceSummary(), loadTimeoffSummary(), loadPayrollSummary()])
    } catch (error) {
      console.error('Raporlar yÃ¼klenemedi:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadAttendanceSummary() {
    try {
      const data = await fetchApi(`/api/hr/reports/attendance-summary?month=${month}`)
      setAttendanceSummary(data?.summary || [])
    } catch {
      setAttendanceSummary([])
    }
  }

  async function loadTimeoffSummary() {
    try {
      const data = await fetchApi(`/api/hr/reports/timeoff-summary?year=${timeoffYear}`)
      setTimeoffSummary(data?.summary || [])
    } catch {
      setTimeoffSummary([])
    }
  }

  async function loadPayrollSummary() {
    try {
      const data = await fetchApi(`/api/hr/reports/payroll-summary?start_date=${payrollRange.start_date}&end_date=${payrollRange.end_date}`)
      setPayrollSummary(data?.summary || { total_net_pay: 0, count: 0 })
    } catch {
      setPayrollSummary({ total_net_pay: 0, count: 0 })
    }
  }

  return (
    <div>
      <div className="flex items-center space-x-2 mb-6">
        <BarChart3 className="w-6 h-6 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Ä°K RaporlarÄ±</h1>
      </div>

      {loading ? (
        <div className="text-gray-400">YÃ¼kleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-white">
            <div className="text-xs text-gray-400">Toplam Ã‡alÄ±ÅŸan</div>
            <div className="text-lg font-semibold">{totals?.employees || 0}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-white">
            <div className="text-xs text-gray-400">Aktif Ã‡alÄ±ÅŸan</div>
            <div className="text-lg font-semibold">{totals?.active_employees || 0}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-white">
            <div className="text-xs text-gray-400">Bekleyen Ä°zin</div>
            <div className="text-lg font-semibold">{totals?.pending_timeoff || 0}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-white">
            <div className="text-xs text-gray-400">Taslak Bordro</div>
            <div className="text-lg font-semibold">{totals?.payroll_drafts || 0}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-white font-medium">Puantaj Ã–zeti</div>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs" />
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="text-gray-400">
                <tr>
                  <th className="text-left py-2 px-2">Ã‡alÄ±ÅŸan</th>
                  <th className="text-right py-2 px-2">Ã‡alÄ±ÅŸma</th>
                  <th className="text-right py-2 px-2">DevamsÄ±zlÄ±k</th>
                  <th className="text-right py-2 px-2">Fazla Mesai</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {attendanceSummary.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-gray-400 py-4">KayÄ±t yok.</td></tr>
                ) : attendanceSummary.map((row) => (
                  <tr key={row.employee_id} className="border-t border-gray-800">
                    <td className="py-2 px-2">{row.full_name}</td>
                    <td className="py-2 px-2 text-right">{row.total_minutes || 0}</td>
                    <td className="py-2 px-2 text-right">{row.absence_minutes || 0}</td>
                    <td className="py-2 px-2 text-right">{row.overtime_minutes || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-white font-medium">Ä°zin Ã–zeti</div>
            <input type="number" min="2000" max="2100" value={timeoffYear} onChange={(e) => setTimeoffYear(e.target.value)} className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs" />
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="text-gray-400">
                <tr>
                  <th className="text-left py-2 px-2">Tip</th>
                  <th className="text-left py-2 px-2">Durum</th>
                  <th className="text-right py-2 px-2">Adet</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {timeoffSummary.length === 0 ? (
                  <tr><td colSpan={3} className="text-center text-gray-400 py-4">KayÄ±t yok.</td></tr>
                ) : timeoffSummary.map((row, index) => (
                  <tr key={`${row.type}-${row.status}-${index}`} className="border-t border-gray-800">
                    <td className="py-2 px-2">{row.type}</td>
                    <td className="py-2 px-2">{row.status}</td>
                    <td className="py-2 px-2 text-right">{row.count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white font-medium">Bordro Ã–zeti</div>
          <div className="flex items-center space-x-2">
            <input type="date" value={payrollRange.start_date} onChange={(e) => setPayrollRange({ ...payrollRange, start_date: e.target.value })} className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs" />
            <input type="date" value={payrollRange.end_date} onChange={(e) => setPayrollRange({ ...payrollRange, end_date: e.target.value })} className="px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs" />
          </div>
        </div>
        <div className="text-white text-sm">
          Toplam Net: {Number(payrollSummary.total_net_pay || 0).toFixed(2)} â€¢ Adet: {payrollSummary.count || 0}
        </div>
      </div>
    </div>
  )
}