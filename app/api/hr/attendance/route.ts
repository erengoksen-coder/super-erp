import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { ok } from '@/lib/api/response'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

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

// GET: Puantaj listesi (tarih aralığı, employee_id)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const singleDate = searchParams.get('date')

    const db = getDatabase()
    let query = `
      SELECT a.*, e.full_name as employee_name
      FROM hr_attendance a
      JOIN hr_employees e ON e.id = a.employee_id AND e.deleted_at IS NULL
      WHERE a.deleted_at IS NULL
    `
    const params: string[] = []
    if (employeeId) {
      query += ' AND a.employee_id = ?'
      params.push(employeeId)
    }
    if (singleDate) {
      query += ' AND a.date = ?'
      params.push(singleDate)
    } else if (startDate && endDate) {
      query += ' AND a.date >= ? AND a.date <= ?'
      params.push(startDate, endDate)
    }
    query += ' ORDER BY a.date DESC, e.full_name'

    const rows = db.prepare(query).all(...params)
    return ok(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Giriş veya çıkış kaydı / manuel kayıt
// body: { employee_id, date, type: 'in'|'out', time?: 'HH:MM' } veya { employee_id, date, check_in?, check_out? }
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { employee_id, date, type, time, check_in, check_out } = body || {}
    if (!employee_id || !date) {
      return NextResponse.json({ error: 'employee_id ve date gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const today = date as string
    const nowTime = new Date().toTimeString().slice(0, 5)

    let checkInVal: string | null = null
    let checkOutVal: string | null = null

    if (type === 'in' || type === 'out') {
      const t = (time || nowTime) as string
      const existing = db.prepare('SELECT id, check_in, check_out FROM hr_attendance WHERE employee_id = ? AND date = ? AND deleted_at IS NULL').get(employee_id, today) as { id: string; check_in: string | null; check_out: string | null } | undefined
      if (type === 'in') {
        checkInVal = t
        if (existing) {
          db.prepare('UPDATE hr_attendance SET check_in = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(t, existing.id)
          recalcAttendance(db, existing.id, employee_id, today, t, existing.check_out)
          return NextResponse.json({ id: existing.id, check_in: t })
        }
      } else {
        checkOutVal = t
        if (existing) {
          db.prepare('UPDATE hr_attendance SET check_out = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(t, existing.id)
          recalcAttendance(db, existing.id, employee_id, today, existing.check_in, t)
          return NextResponse.json({ id: existing.id, check_out: t })
        }
        checkInVal = (existing as { check_in: string | null } | undefined)?.check_in ?? null
      }
    } else {
      // Boş string gönderilirse mevcut değeri koru; sadece dolu değerle güncelle
      const trim = (v: unknown) => (v != null && String(v).trim() !== '' ? String(v).trim() : null)
      checkInVal = trim(check_in)
      checkOutVal = trim(check_out)
    }

    const existing = db.prepare('SELECT id, check_in, check_out FROM hr_attendance WHERE employee_id = ? AND date = ? AND deleted_at IS NULL').get(employee_id, today) as { id: string; check_in: string | null; check_out: string | null } | undefined
    if (existing) {
      const cin = checkInVal ?? existing.check_in
      const cout = checkOutVal ?? existing.check_out
      db.prepare('UPDATE hr_attendance SET check_in = COALESCE(?, check_in), check_out = COALESCE(?, check_out), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(cin, cout, existing.id)
      recalcAttendance(db, existing.id, employee_id, today, cin, cout)
      return NextResponse.json({ id: existing.id })
    }

    const id = randomUUID()
    const expected = getExpectedMinutes(db, employee_id)
    let totalMin = 0
    let overtimeMin = 0
    if (checkInVal && checkOutVal) {
      totalMin = Math.max(0, minutesBetween(checkInVal, checkOutVal))
      overtimeMin = Math.max(0, totalMin - expected)
    }
    db.prepare(`
      INSERT INTO hr_attendance (id, employee_id, date, check_in, check_out, expected_minutes, total_minutes, overtime_minutes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'present', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, employee_id, today, checkInVal, checkOutVal, expected, totalMin, overtimeMin)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

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
