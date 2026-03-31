import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { format } from 'date-fns'

export const GET = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId } = authUser
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')

    const db = getDatabase()

    // Tüm çalışanları çek ve seçilen tarihteki attendance ile JOIN et
    const attendances = db.prepare(`
      SELECT 
        e.id as employee_id, e.full_name,
        d.name as department_name,
        st.name as shift_name, st.start_time as planned_start, st.end_time as planned_end,
        a.id, a.check_in, a.check_out, a.late_minutes, a.total_minutes, a.status
      FROM hr_employees e
      JOIN hr_employee_profiles ep ON e.id = ep.employee_id
      LEFT JOIN hr_departments d ON ep.department_id = d.id
      LEFT JOIN hr_shift_templates st ON ep.shift_id = st.id
      LEFT JOIN hr_attendance a ON e.id = a.employee_id AND a.date = ?
      WHERE e.company_id = ? AND e.branch_id = ? AND e.deleted_at IS NULL
      ORDER BY d.name, e.full_name
    `).all(date, companyId, branchId) as any[]

    return ok(attendances)
  })
})
