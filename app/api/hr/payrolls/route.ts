import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

export const GET = withAuth(async () => {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT p.*, e.full_name
    FROM hr_payrolls p
    JOIN hr_employees e ON p.employee_id = e.id
    WHERE p.deleted_at IS NULL
    ORDER BY p.period_start DESC
  `).all()
  return NextResponse.json({ payrolls: rows })
})

export const POST = withAuth(async (request: NextRequest) => {
  const body = await request.json() as {
    employee_id?: string
    period_start?: string
    period_end?: string
    base_gross?: number
    gross_earnings?: number
    total_deductions?: number
    net_pay?: number
    currency?: string
    status?: string
    notes?: string | null
  }
  if (!body.employee_id || !body.period_start || !body.period_end) {
    return NextResponse.json({ error: 'employee_id, period_start, period_end gerekli' }, { status: 400 })
  }
  const db = getDatabase()
  const id = randomUUID()
  db.prepare(`
    INSERT INTO hr_payrolls
    (id, employee_id, period_start, period_end, base_gross, gross_earnings, total_deductions, net_pay, currency, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(
    id,
    body.employee_id,
    body.period_start,
    body.period_end,
    body.base_gross ?? 0,
    body.gross_earnings ?? 0,
    body.total_deductions ?? 0,
    body.net_pay ?? 0,
    body.currency ?? 'TRY',
    body.status ?? 'draft',
    body.notes ?? null
  )
  return NextResponse.json({ id }, { status: 201 })
})
