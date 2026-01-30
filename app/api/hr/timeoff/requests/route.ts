import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

export const GET = withAuth(async () => {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT r.*, e.full_name
    FROM hr_timeoff_requests r
    JOIN hr_employees e ON r.employee_id = e.id
    WHERE r.deleted_at IS NULL
    ORDER BY r.start_date DESC
  `).all()
  return NextResponse.json({ requests: rows })
})

export const POST = withAuth(async (request: NextRequest) => {
  const body = await request.json() as {
    employee_id?: string
    type?: string
    start_date?: string
    end_date?: string
    total_days?: number
    reason?: string | null
    notes?: string | null
  }
  if (!body.employee_id || !body.type || !body.start_date || !body.end_date) {
    return NextResponse.json({ error: 'employee_id, type, start_date, end_date gerekli' }, { status: 400 })
  }
  const db = getDatabase()
  const id = randomUUID()
  db.prepare(`
    INSERT INTO hr_timeoff_requests
    (id, employee_id, type, start_date, end_date, total_days, status, reason, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    id,
    body.employee_id,
    body.type,
    body.start_date,
    body.end_date,
    body.total_days ?? 0,
    body.reason ?? null,
    body.notes ?? null
  )
  return NextResponse.json({ id }, { status: 201 })
})
