import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

// GET: İK özet sayıları (headcount, departman, açık ilan, bekleyen izin)
export const GET = withAuth(async () => {
  try {
    const db = getDatabase()
    const employees = db.prepare(
      'SELECT COUNT(*) as c FROM hr_employees WHERE deleted_at IS NULL AND status = ?'
    ).get('active') as { c: number }
    const departments = db.prepare(
      'SELECT COUNT(*) as c FROM hr_departments WHERE deleted_at IS NULL'
    ).get() as { c: number }
    const openPositions = db.prepare(
      'SELECT COUNT(*) as c FROM hr_job_openings WHERE deleted_at IS NULL AND status = ?'
    ).get('open') as { c: number }
    const pendingLeave = db.prepare(
      'SELECT COUNT(*) as c FROM hr_timeoff_requests WHERE deleted_at IS NULL AND status = ?'
    ).get('pending') as { c: number }
    const today = new Date().toISOString().split('T')[0]
    const todayClockedIn = db.prepare(
      'SELECT COUNT(*) as c FROM hr_attendance WHERE date = ? AND deleted_at IS NULL AND check_in IS NOT NULL'
    ).get(today) as { c: number }
    const currentlyInside = db.prepare(
      'SELECT COUNT(*) as c FROM hr_attendance WHERE date = ? AND deleted_at IS NULL AND check_in IS NOT NULL AND check_out IS NULL'
    ).get(today) as { c: number }
    return NextResponse.json({
      active_employees: employees?.c ?? 0,
      departments: departments?.c ?? 0,
      open_positions: openPositions?.c ?? 0,
      pending_leave_requests: pendingLeave?.c ?? 0,
      pdks_today_clocked_in: todayClockedIn?.c ?? 0,
      pdks_currently_inside: currentlyInside?.c ?? 0,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
