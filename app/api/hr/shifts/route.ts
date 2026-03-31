import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

export const GET = withAuth(async (_request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId } = authUser
    const db = getDatabase()

    const shifts = db.prepare(`
      SELECT * FROM hr_shift_templates 
      WHERE company_id = ? AND branch_id = ? AND deleted_at IS NULL
    `).all(companyId, branchId)

    return ok(shifts)
  })
})

export const POST = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId } = authUser
    const body = await request.json()
    const { name, start_time, end_time, break_minutes, work_days } = body

    if (!name || !start_time || !end_time) {
      return fail('Eksik bilgi: Ad, başlangıç ve bitiş saati zorunludur.')
    }

    const db = getDatabase()
    const id = randomUUID()

    db.prepare(`
      INSERT INTO hr_shift_templates (id, name, start_time, end_time, break_minutes, work_days, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, start_time, end_time, break_minutes || 60, work_days || '1,2,3,4,5', companyId, branchId)

    return ok({ id, name })
  })
})
