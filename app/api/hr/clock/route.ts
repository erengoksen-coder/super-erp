import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { apiLogger } from '@/lib/api/logger'

/**
 * Puantaj giriş/çıkış (oturum açmış kullanıcı için).
 * POST body: { event: 'in' | 'out', location?: string }
 * Çalışan, kullanıcı e-postası ile eşleşen hr_employees kaydı üzerinden bulunur.
 */
function timeToMinutes(t: string): number {
  const [h, m] = (t || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
function minutesBetween(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start)
}
function getExpectedMinutes(db: ReturnType<typeof getDatabase>, employeeId: string): number {
  const profile = db.prepare('SELECT shift_template_id FROM hr_employee_profiles WHERE employee_id = ? AND deleted_at IS NULL').get(employeeId) as { shift_template_id: string | null } | undefined
  if (!profile?.shift_template_id) return 8 * 60
  const shift = db.prepare('SELECT start_time, end_time, break_minutes FROM hr_shift_templates WHERE id = ? AND deleted_at IS NULL').get(profile.shift_template_id) as { start_time: string; end_time: string; break_minutes: number } | undefined
  if (!shift) return 8 * 60
  const work = minutesBetween(shift.start_time, shift.end_time) - (shift.break_minutes || 0)
  return Math.max(0, work)
}
function recalcAttendance(db: ReturnType<typeof getDatabase>, rowId: string, employeeId: string, date: string, checkIn: string | null, checkOut: string | null) {
  const expected = getExpectedMinutes(db, employeeId)
  let totalMin = 0
  let overtimeMin = 0
  if (checkIn && checkOut) {
    totalMin = Math.max(0, minutesBetween(checkIn, checkOut))
    overtimeMin = Math.max(0, totalMin - expected)
  }
  db.prepare('UPDATE hr_attendance SET expected_minutes = ?, total_minutes = ?, overtime_minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(expected, totalMin, overtimeMin, rowId)
}

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = await parseJsonBody(request).catch(() => null)
    const event = (body?.event ?? body?.type) as string | undefined
    const workplace_id = (body?.location ?? body?.workplace_id) as string | undefined
    if (event !== 'in' && event !== 'out') {
      return NextResponse.json({ error: 'event: "in" veya "out" gerekli' }, { status: 400 })
    }
    const userId = user?.userId
    if (!userId) {
      return NextResponse.json({ error: 'Oturum gerekli' }, { status: 401 })
    }
    const db = getDatabase()
    const u = db.prepare('SELECT email FROM users WHERE id = ? AND deleted_at IS NULL').get(userId) as { email: string | null } | undefined
    const email = u?.email ?? ''
    const emp = db.prepare('SELECT id FROM hr_employees WHERE email = ? AND deleted_at IS NULL AND status = ?').get(email, 'active') as { id: string } | undefined
    const employee_id = emp?.id
    if (!employee_id) {
      return NextResponse.json(
        { error: 'Bu hesaba bağlı çalışan kaydı bulunamadı. İK ile iletişime geçin.' },
        { status: 400 }
      )
    }
    const today = new Date().toISOString().slice(0, 10)
    const nowTime = new Date().toTimeString().slice(0, 5)
    const existing = db.prepare('SELECT id, check_in, check_out FROM hr_attendance WHERE employee_id = ? AND date = ? AND deleted_at IS NULL').get(employee_id, today) as { id: string; check_in: string | null; check_out: string | null } | undefined

    if (event === 'in') {
      if (existing) {
        const stmt = workplace_id
          ? db.prepare('UPDATE hr_attendance SET check_in = ?, workplace_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          : db.prepare('UPDATE hr_attendance SET check_in = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        if (workplace_id) stmt.run(nowTime, workplace_id, existing.id)
        else stmt.run(nowTime, existing.id)
        recalcAttendance(db, existing.id, employee_id, today, nowTime, existing.check_out)
        return NextResponse.json({ id: existing.id, event: 'in', check_in: nowTime })
      }
      const id = randomUUID()
      const expected = getExpectedMinutes(db, employee_id)
      if (workplace_id) {
        db.prepare(`
          INSERT INTO hr_attendance (id, employee_id, date, check_in, check_out, workplace_id, expected_minutes, total_minutes, overtime_minutes, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, NULL, ?, ?, 0, 0, 'present', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(id, employee_id, today, nowTime, workplace_id, expected)
      } else {
        db.prepare(`
          INSERT INTO hr_attendance (id, employee_id, date, check_in, check_out, expected_minutes, total_minutes, overtime_minutes, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, NULL, ?, 0, 0, 'present', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(id, employee_id, today, nowTime, expected)
      }
      return NextResponse.json({ id, event: 'in', check_in: nowTime }, { status: 201 })
    }

    // event === 'out'
    if (existing) {
      db.prepare('UPDATE hr_attendance SET check_out = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nowTime, existing.id)
      recalcAttendance(db, existing.id, employee_id, today, existing.check_in, nowTime)
      return NextResponse.json({ id: existing.id, event: 'out', check_out: nowTime })
    }
    const id = randomUUID()
    const expected = getExpectedMinutes(db, employee_id)
    let totalMin = 0
    let overtimeMin = 0
    db.prepare(`
      INSERT INTO hr_attendance (id, employee_id, date, check_in, check_out, expected_minutes, total_minutes, overtime_minutes, status, created_at, updated_at)
      VALUES (?, ?, ?, NULL, ?, ?, 0, 0, 'present', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, employee_id, today, nowTime, expected)
    return NextResponse.json({ id, event: 'out', check_out: nowTime }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Puantaj kaydı alınamadı'
    apiLogger.error('HR clock POST failed', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
