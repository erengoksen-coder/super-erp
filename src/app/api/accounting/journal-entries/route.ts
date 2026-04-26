import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { financeService } from '@/lib/services/finance-service'
import { journalEntrySchema } from '@/lib/validation/finance-schema'
import { AuditService } from '@/lib/services/audit'

export const GET = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId } = authUser
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date') || undefined
    const endDate = searchParams.get('end_date') || undefined

    const entries = await financeService.getJournalEntries(companyId, branchId, startDate, endDate)
    return ok(entries)
  })
})

export const POST = withAuth(async (request: NextRequest, authUser) => {
  return handleApi(async () => {
    const { userId, companyId, branchId } = authUser
    const body = await request.json()

    // 1. Zod Doğrulama
    const result = journalEntrySchema.safeParse(body)
    if (!result.success) {
      return fail(result.error.errors[0].message, { status: 400 })
    }

    // 2. Servis Çağrısı
    const entryId = await financeService.createJournalEntry(companyId, branchId, result.data)
    
    // 3. AUDIT LOG
    await AuditService.log({
      userId,
      companyId,
      branchId,
      actionType: 'CREATE',
      entityName: 'journal_entries',
      entityId: entryId,
      newData: body,
      description: `Yeni yevmiye fişi oluşturuldu: ${body.description || ''}`,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return ok({ id: entryId })
  })
})
