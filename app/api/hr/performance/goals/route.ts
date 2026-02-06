import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// GET: Hedefler (employee_id, period_year ile filtre)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const year = searchParams.get('year')

    const db = getDatabase()
    let query = `
      SELECT g.*, e.full_name as employee_name
      FROM hr_performance_goals g
      JOIN hr_employees e ON e.id = g.employee_id AND e.deleted_at IS NULL
      WHERE g.deleted_at IS NULL
    `
    const params: (string | number)[] = []
    if (employeeId) {
      query += ' AND g.employee_id = ?'
      params.push(employeeId)
    }
    if (year) {
      query += " AND (strftime('%Y', g.period_start) = ? OR strftime('%Y', g.period_end) = ?)"
      params.push(year, year)
    }
    query += ' ORDER BY g.period_start DESC, g.created_at DESC'

    const rows = db.prepare(query).all(...params)
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Yeni hedef
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { employee_id, title, description, target_value, current_value, period_start, period_end } = body || {}
    if (!employee_id || !title || !String(title).trim()) {
      return NextResponse.json({ error: 'employee_id ve title gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO hr_performance_goals
      (id, employee_id, title, description, target_value, current_value, period_start, period_end, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      employee_id,
      String(title).trim(),
      description ? String(description).trim() : null,
      target_value != null ? String(target_value) : null,
      current_value != null ? String(current_value) : null,
      period_start ? String(period_start).trim() : null,
      period_end ? String(period_end).trim() : null
    )
    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
