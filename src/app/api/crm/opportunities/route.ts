import { ok } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { handleApi } from '@/lib/api/handler'
import { getDatabase } from '@/lib/database/db'

export const GET = withAuth(async (request, user) => {
  return handleApi(async () => {
    const db = getDatabase()
    const { companyId } = user

    const opportunities = db.prepare(`
      SELECT o.*, a.name as account_name 
      FROM crm_opportunities o
      LEFT JOIN accounts a ON o.account_id = a.id
      WHERE o.company_id = ? AND o.deleted_at IS NULL
      ORDER BY o.created_at DESC
    `).all(companyId)

    return ok(opportunities)
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
      INSERT INTO crm_opportunities (id, lead_id, account_id, title, description, value, stage, probability, expected_close_date, assigned_to, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.lead_id || null,
      data.account_id || null,
      data.title,
      data.description,
      data.value || 0,
      data.stage || 'qualification',
      data.probability || 10,
      data.expected_close_date,
      user.id,
      companyId,
      branchId
    )

    return ok({ id })
  })
})
