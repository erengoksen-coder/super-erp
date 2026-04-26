import { ok } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'

export const GET = withAuth(async (request, user) => {
  return handleApi(async () => {
    const db = getDatabase()
    const { companyId } = user

    const leads = db.prepare(`
      SELECT * FROM crm_leads 
      WHERE company_id = ? AND deleted_at IS NULL
      ORDER BY created_at DESC
    `).all(companyId)

    return ok(leads)
  })
})

export const POST = withAuth(async (request, user) => {
  return handleApi(async () => {
    const db = getDatabase()
    const { companyId, branchId } = user
    const data = await request.json()
    const { randomUUID } = await import('crypto')

    const id = randomUUID()
    db.prepare(`
      INSERT INTO crm_leads (id, first_name, last_name, company_name, email, phone, source, status, score, notes, assigned_to, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.first_name,
      data.last_name,
      data.company_name,
      data.email,
      data.phone,
      data.source || 'manual',
      data.status || 'new',
      data.score || 0,
      data.notes,
      user.id,
      companyId,
      branchId
    )

    return ok({ id })
  })
})
