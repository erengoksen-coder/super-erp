import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return 0
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
}

export const GET = withAuth(async () => {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT a.*, e.full_name
    FROM hr_attendance a
    JOIN hr_employees e ON a.employee_id = e.id
    WHERE a.deleted_at IS NULL
    ORDER BY a.date DESC
  `).all()
  return NextResponse.json({ records: rows })
})

export const POST = withAuth(async (request: NextRequest) => {
  const body = await request.json() as {
    employee_id?: string
    date?: string
    check_in?: string | null
    check_out?: string | null
    break_minutes?: number | null
    notes?: string | null
  }
  if (!body.employee_id || !body.date) {
    return NextResponse.json({ error: 'employee_id ve date gerekli' }, { status: 400 })
  }
  const totalMinutes = minutesBetween(body.check_in, body.check_out) - (body.break_minutes || 0)
  const expectedMinutes = 600
  const missing = Math.max(0, expectedMinutes - Math.max(0, totalMinutes))
  const absenceMinutes = missing > 0 ? missing + 90 : 0
  const overtimeMinutes = Math.max(0, totalMinutes - expectedMinutes)
  const db = getDatabase()
  const id = randomUUID()
  db.prepare(`
    INSERT INTO hr_attendance
    (id, employee_id, date, check_in, check_out, break_minutes, total_minutes, expected_minutes, absence_minutes, overtime_minutes, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'present', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    id,
    body.employee_id,
    body.date,
    body.check_in ?? null,
    body.check_out ?? null,
    body.break_minutes ?? 0,
    Math.max(0, totalMinutes),
    expectedMinutes,
    absenceMinutes,
    overtimeMinutes,
    body.notes ?? null
  )
  return NextResponse.json({ id }, { status: 201 })
})
