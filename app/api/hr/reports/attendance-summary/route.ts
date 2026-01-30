import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const db = getDatabase()
    let query = `
      SELECT a.employee_id, e.full_name,
        SUM(a.total_minutes) as total_minutes,
        SUM(a.absence_minutes) as absence_minutes,
        SUM(a.overtime_minutes) as overtime_minutes
      FROM hr_attendance a
      JOIN hr_employees e ON a.employee_id = e.id
      WHERE a.deleted_at IS NULL
    `
    const params: Array<string> = []
    if (month) {
      query += ' AND substr(a.date, 1, 7) = ?'
      params.push(month)
    }
    if (startDate) {
      query += ' AND a.date >= ?'
      params.push(startDate)
    }
    if (endDate) {
      query += ' AND a.date <= ?'
      params.push(endDate)
    }
    query += ' GROUP BY a.employee_id ORDER BY e.full_name'
    const rows = db.prepare(query).all(...params)
    return NextResponse.json({ summary: rows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
