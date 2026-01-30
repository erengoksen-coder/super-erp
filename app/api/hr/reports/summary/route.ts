import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

export const GET = withAuth(async (_request: NextRequest) => {
  try {
    const db = getDatabase()
    const totalEmployees = db.prepare(`SELECT COUNT(*) as count FROM hr_employees WHERE deleted_at IS NULL`).get() as { count: number }
    const activeEmployees = db.prepare(`SELECT COUNT(*) as count FROM hr_employees WHERE deleted_at IS NULL AND status = 'active'`).get() as { count: number }
    const pendingTimeoff = db.prepare(`SELECT COUNT(*) as count FROM hr_timeoff_requests WHERE deleted_at IS NULL AND status = 'pending'`).get() as { count: number }
    const payrollDrafts = db.prepare(`SELECT COUNT(*) as count FROM hr_payrolls WHERE deleted_at IS NULL AND status = 'draft'`).get() as { count: number }
    return NextResponse.json({
      totals: {
        employees: totalEmployees.count || 0,
        active_employees: activeEmployees.count || 0,
        pending_timeoff: pendingTimeoff.count || 0,
        payroll_drafts: payrollDrafts.count || 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
