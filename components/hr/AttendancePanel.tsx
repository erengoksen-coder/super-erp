'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { format } from 'date-fns'
import { 
  Users, 
  Clock, 
  LogIn, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle 
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

export function AttendancePanel() {
  const [attendances, setAttendances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const loadAttendance = async (date: string) => {
    setLoading(true)
    try {
      // API: GET /api/hr/attendance?date=...
      const data = await fetchApi(`/api/hr/attendance?date=${date}`)
      setAttendances(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error('Devam kayıtları yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAttendance(selectedDate) }, [selectedDate])

  const getStatusBadge = (att: any) => {
    if (!att.check_in) return <Badge color="error">Giriş Yapmadı</Badge>
    if (att.late_minutes > 0) return <Badge color="warning">Geç Kaldı ({att.late_minutes} dk)</Badge>
    return <Badge color="success">Zamanında</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-green-500" /> Günlük Devam Takibi
        </h3>
        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            value={selectedDate} 
            className="w-40 h-9"
            onChange={e => setSelectedDate(e.target.value)} 
          />
          <Button size="sm" variant="outline" onClick={() => loadAttendance(selectedDate)}>
            Yenile
          </Button>
        </div>
      </div>

      <Card variant="elevated" padding="none">
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-white/5 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-400">Personel</th>
                  <th className="px-6 py-4 font-semibold text-gray-400">Vardiya</th>
                  <th className="px-6 py-4 font-semibold text-gray-400">Giriş</th>
                  <th className="px-6 py-4 font-semibold text-gray-400">Çıkış</th>
                  <th className="px-6 py-4 font-semibold text-gray-400">Çalışma Süresi</th>
                  <th className="px-6 py-4 font-semibold text-gray-400">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {attendances.map(att => (
                  <tr key={att.id || att.employee_id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{att.full_name}</span>
                        <span className="text-[10px] text-gray-500 uppercase">{att.department_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-400">
                      {att.planned_start} - {att.planned_end}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {att.check_in ? (
                        <div className="flex items-center gap-1.5 text-green-400">
                          <LogIn className="w-3.5 h-3.5" /> {att.check_in}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {att.check_out ? (
                        <div className="flex items-center gap-1.5 text-blue-400">
                          <LogOut className="w-3.5 h-3.5" /> {att.check_out}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {att.total_minutes ? `${Math.floor(att.total_minutes / 60)}s ${att.total_minutes % 60}dk` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(att)}
                    </td>
                  </tr>
                ))}
                {attendances.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Bu tarih için herhangi bir veri bulunamadı.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 animate-pulse">
                      Yükleniyor...
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
