import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { scmService } from '@/lib/services/scm-service'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { getPaginationParams, createPaginatedResponse } from '@/lib/pagination'
import { logInfo, logError } from '@/lib/logger'
import { createAccountSchema, updateAccountSchema } from '@/lib/validations/accounts'
import { z } from 'zod'

// GET: Cari hesapları listeler (Sayfalamalı ve Filtreli)
export const GET = withAuth(async (request, _user) => {
  return handleApi(async () => {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'customer' | 'vendor' | null
    
    // Pagination Utility Kullanımı
    const pagination = getPaginationParams(request)
    
    const { data, total } = await scmService.getAccounts(
      type || undefined, 
      pagination.limit, 
      pagination.offset
    )

    // Toplam müşteri ve tedarikçi sayılarını hesapla (Sayfalamadan bağımsız)
    const db = getDatabase()
    const counts = db.prepare(`
      SELECT 
        COUNT(CASE WHEN type = 'customer' THEN 1 END) as customers,
        COUNT(CASE WHEN type = 'vendor' THEN 1 END) as vendors
      FROM accounts WHERE deleted_at IS NULL
    `).get() as { customers: number, vendors: number }
    
    return ok(data, { 
      meta: { 
        total,
        customerCount: counts.customers,
        vendorCount: counts.vendors,
        limit: pagination.limit, 
        offset: pagination.offset 
      } 
    })
  })
})

// POST: Yeni cari hesap oluşturur
export const POST = withAuth(async (request, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId, userId } = authUser
    const body = await parseJsonBody(request)
    
    // Zod Doğrulaması (Phase 3 Standardı)
    const result = createAccountSchema.safeParse(body)
    if (!result.success) {
      logError('Cari hesap doğrulama hatası', result.error)
      return fail(result.error.errors[0].message, { status: 400 })
    }

    logInfo('Yeni cari hesap oluşturuluyor', { code: result.data.code, type: result.data.type })

    const { accountId } = await scmService.createAccount(result.data as any, companyId, branchId, userId)
    
    logInfo('Cari hesap başarıyla oluşturuldu', { id: accountId })
    return ok({ id: accountId }, { message: 'Cari hesap başarıyla oluşturuldu' })
  })
})
