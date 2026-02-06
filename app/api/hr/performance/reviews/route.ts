import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// GET: Değerlendirmeler (employee_id, year ile filtre)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const year = searchParams.get('year')

    const db = getDatabase()
    let query = `
      SELECT r.*, e.full_name as employee_name
      FROM hr_performance_reviews r
      JOIN hr_employees e ON e.id = r.employee_id AND e.deleted_at IS NULL
      WHERE r.deleted_at IS NULL
    `
    const params: (string | number)[] = []
    if (employeeId) {
      query += ' AND r.employee_id = ?'
      params.push(employeeId)
    }
    if (year) {
      query += " AND (strftime('%Y', r.period_start) = ? OR strftime('%Y', r.period_end) = ?)"
      params.push(year, year)
    }
    query += ' ORDER BY r.period_end DESC, r.created_at DESC'

    const rows = db.prepare(query).all(...params)
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Yeni değerlendirme
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { employee_id, period_start, period_end, rating, comment } = body || {}
    if (!employee_id || !period_start || !period_end) {
      return NextResponse.json({ error: 'employee_id, period_start, period_end gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const id = randomUUID()
    const reviewerId = (body as any).reviewer_id ?? null
    db.prepare(`
      INSERT INTO hr_performance_reviews
      (id, employee_id, reviewer_id, period_start, period_end, rating, comment, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      employee_id,
      reviewerId,
      period_start,
      period_end,
      rating != null ? Number(rating) : null,
      comment ? String(comment).trim() : null
    )
    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
