'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Clock, LogIn, LogOut, User } from 'lucide-react'
import { fetchApi } from '@/lib/api/fetch'

type MeResponse = { user?: { full_name?: string; employee_id?: string | null } }
type AttendanceRow = { check_in: string | null; check_out: string | null }

export default function HrClockPage() {
  const searchParams = useSearchParams()
  const location = searchParams.get('location') || ''

  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<MeResponse | null>(null)
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRow | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const today = typeof window !== 'undefined'
    ? new Date().toISOString().slice(0, 10)
    : ''

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await fetchApi<MeResponse>('/api/auth/me').catch(() => null)
        if (cancelled) return
        setMe(data as MeResponse | null)
        const user = (data as any)?.user
        const employeeId = user?.employee_id
        if (employeeId && today) {
          const list = await fetchApi<AttendanceRow[]>(
            `/api/hr/attendance?employee_id=${encodeURIComponent(employeeId)}&date=${today}`
          ).catch(() => [])
          if (cancelled) return
          const arr = Array.isArray(list) ? list : []
          setTodayAttendance(arr[0] || null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [today])

  async function doClock(type: 'in' | 'out') {
    const user = (me as any)?.user
    const employeeId = user?.employee_id
    if (!employeeId || !today) return
    setActionLoading(true)
    setMessage(null)
    try {
      await fetchApi('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, date: today, type }),
      })
      setMessage({ type: 'ok', text: type === 'in' ? `Giriş kaydedildi (${new Date().toTimeString().slice(0, 5)})` : `Çıkış kaydedildi (${new Date().toTimeString().slice(0, 5)})` })
      setTodayAttendance((prev) => {
        if (type === 'in') return { check_in: new Date().toTimeString().slice(0, 5), check_out: null }
        return prev ? { ...prev, check_out: new Date().toTimeString().slice(0, 5) } : { check_in: null, check_out: new Date().toTimeString().slice(0, 5) }
      })
    } catch (e: any) {
      setMessage({ type: 'err', text: e?.message || 'Kayıt alınamadı' })
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-gray-400">Yükleniyor...</div>
      </div>
    )
  }

  const user = (me as any)?.user
  const employeeId = user?.employee_id
  const notLoggedIn = !me || !user
  const loginUrl = `/auth/login?returnUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/hr/clock' + (location ? `?location=${location}` : ''))}`

  if (notLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-sm w-full text-center">
          <Clock className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Puantaj (Giriş/Çıkış)</h1>
          <p className="text-gray-400 text-sm mb-6">Kayıt yapmak için sisteme giriş yapın.</p>
          <Link
            href={loginUrl}
            className="inline-flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-500"
          >
            <LogIn className="w-5 h-5" />
            Giriş yap
          </Link>
        </div>
      </div>
    )
  }

  if (!employeeId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-sm w-full text-center">
          <User className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Çalışan kaydı bulunamadı</h1>
          <p className="text-gray-400 text-sm">Hesabınız (e-posta) ile eşleşen aktif çalışan kaydı yok. İK ile iletişime geçin.</p>
        </div>
      </div>
    )
  }

  const hasCheckIn = !!todayAttendance?.check_in
  const hasCheckOut = !!todayAttendance?.check_out

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="w-10 h-10 text-blue-400" />
          <div>
            <h1 className="text-xl font-semibold text-white">Puantaj</h1>
            <p className="text-gray-400 text-sm">{user?.full_name || 'Çalışan'}</p>
          </div>
        </div>

        {location && (
          <p className="text-xs text-gray-500 mb-4">Lokasyon: {location}</p>
        )}

        <div className="space-y-3 mb-6">
          {todayAttendance?.check_in && (
            <p className="text-sm text-gray-300">Giriş: <span className="text-white font-medium">{todayAttendance.check_in}</span></p>
          )}
          {todayAttendance?.check_out && (
            <p className="text-sm text-gray-300">Çıkış: <span className="text-white font-medium">{todayAttendance.check_out}</span></p>
          )}
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'ok' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
            {message.text}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {!hasCheckIn && (
            <button
              type="button"
              onClick={() => doClock('in')}
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-2 w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-500 disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              Giriş yap
            </button>
          )}
          {hasCheckIn && !hasCheckOut && (
            <button
              type="button"
              onClick={() => doClock('out')}
              disabled={actionLoading}
              className="inline-flex items-center justify-center gap-2 w-full bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-500 disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              Çıkış yap
            </button>
          )}
          {hasCheckIn && hasCheckOut && (
            <p className="text-center text-gray-400 text-sm py-2">Bugünkü giriş ve çıkış kaydınız alındı.</p>
          )}
        </div>
      </div>
    </div>
  )
}
