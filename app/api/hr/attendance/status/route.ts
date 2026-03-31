import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { format } from 'date-fns'

export const GET = withAuth(async (_request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { userId, companyId, branchId } = authUser
    const db = getDatabase()
    const today = format(new Date(), 'yyyy-MM-dd')

    const attendance = db.prepare(`
      SELECT * FROM hr_attendance 
      WHERE employee_id = ? AND date = ? AND company_id = ? AND branch_id = ?
    `).get(userId, today, companyId, branchId)

    return ok(attendance || { check_in: null, check_out: null })
  })
})
