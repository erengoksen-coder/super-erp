import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { format } from 'date-fns'

export const GET = withAuth(async (_request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId } = authUser
    const db = getDatabase()
    const today = format(new Date(), 'yyyy-MM-dd')

    // 1. Temel İstatistikler (Multi-tenancy)
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM hr_employees WHERE company_id = ? AND branch_id = ? AND status = 'active') as total_employees,
        (SELECT COUNT(*) FROM hr_attendance WHERE date = ? AND company_id = ? AND branch_id = ? AND check_in IS NOT NULL) as present_today,
        (SELECT COUNT(*) FROM hr_attendance WHERE date = ? AND company_id = ? AND branch_id = ? AND check_in IS NULL) as absent_today,
        (SELECT COUNT(*) FROM hr_timeoff_requests WHERE ? BETWEEN start_date AND end_date AND status = 'approved') as on_leave
    `).get(companyId, branchId, today, companyId, branchId, today, companyId, branchId, today) as any

    // 2. Yaklaşan Doğum GÜnleri (Multi-tenancy)
    const upcomingBirthdays = db.prepare(`
      SELECT first_name, last_name, birth_date 
      FROM hr_employees 
      WHERE company_id = ? AND branch_id = ? 
        AND strftime('%m-%d', birth_date) >= strftime('%m-%d', 'now')
      ORDER BY strftime('%m-%d', birth_date) ASC
      LIMIT 10
    `).all(companyId, branchId)

    return ok({
      stats,
      upcomingBirthdays
    })
  })
})
