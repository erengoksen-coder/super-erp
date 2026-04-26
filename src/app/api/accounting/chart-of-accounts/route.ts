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
    
    const accounts = db.prepare(`
      SELECT 
        coa.*,
        (SELECT COUNT(*) FROM chart_of_accounts WHERE parent_id = coa.id AND deleted_at IS NULL) as child_count
      FROM chart_of_accounts coa
      WHERE coa.company_id = ? AND coa.branch_id = ? AND coa.deleted_at IS NULL
      ORDER BY coa.code ASC
    `).all(companyId, branchId)

    return ok(accounts)
  })
})

export const POST = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId } = authUser
    const body = await request.json()
    const { code, name, account_type, parent_id } = body

    if (!code?.trim() || !name?.trim() || !account_type?.trim()) {
      return fail('Kod, ad ve hesap tipi zorunludur.')
    }

    const db = getDatabase()
    
    const existing = db.prepare(`
      SELECT id FROM chart_of_accounts 
      WHERE code = ? AND company_id = ? AND branch_id = ? AND deleted_at IS NULL
    `).get(code.trim(), companyId, branchId)

    if (existing) {
      return fail('Bu hesap kodu zaten kullanılıyor.')
    }

    const id = randomUUID()
    db.prepare(`
      INSERT INTO chart_of_accounts (id, code, name, account_type, type, parent_id, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, code.trim(), name.trim(), account_type, account_type, parent_id || null, companyId, branchId)

    return ok({ id })
  })
})
