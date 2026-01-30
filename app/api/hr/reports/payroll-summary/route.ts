import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const db = getDatabase()
    let query = `
      SELECT SUM(net_pay) as total_net_pay, COUNT(*) as count
      FROM hr_payrolls
      WHERE deleted_at IS NULL
    `
    const params: Array<string> = []
    if (startDate) {
      query += ' AND period_start >= ?'
      params.push(startDate)
    }
    if (endDate) {
      query += ' AND period_end <= ?'
      params.push(endDate)
    }
    const row = db.prepare(query).get(...params) as { total_net_pay?: number | null; count?: number | null }
    return NextResponse.json({
      summary: {
        total_net_pay: row?.total_net_pay || 0,
        count: row?.count || 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
