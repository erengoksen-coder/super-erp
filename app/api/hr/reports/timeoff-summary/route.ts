import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const db = getDatabase()
    let query = `
      SELECT type, status, COUNT(*) as count
      FROM hr_timeoff_requests
      WHERE deleted_at IS NULL
    `
    const params: Array<string> = []
    if (year) {
      query += ' AND substr(start_date, 1, 4) = ?'
      params.push(year)
    }
    query += ' GROUP BY type, status ORDER BY type, status'
    const rows = db.prepare(query).all(...params)
    return NextResponse.json({ summary: rows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
