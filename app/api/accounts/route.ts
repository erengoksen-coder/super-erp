import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { scmService } from '@/lib/services/scm-service'
import { accountSchema } from '@/lib/validation/scm-schema'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// GET: Cari hesapları listeler
export const GET = withAuth(async (request, _user) => {
  return handleApi(async () => {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'customer' | 'vendor' | null
    
    const list = await scmService.getAccounts(type || undefined)
    return ok(list)
  })
})

// POST: Yeni cari hesap oluşturur
export const POST = withAuth(async (request, authUser) => {
  return handleApi(async () => {
    const { companyId, branchId, userId } = authUser
    const body = await parseJsonBody(request)
    
    // Zod Doğrulaması
    const validation = accountSchema.safeParse(body)
    if (!validation.success) {
      return fail(validation.error.errors[0].message, { status: 400 })
    }

    const { accountId } = await scmService.createAccount(validation.data, companyId, branchId, userId)
    
    return ok({ id: accountId }, { message: 'Cari hesap başarıyla oluşturuldu' })
  })
})

// PATCH: Cari hesap güncelleme
export const PATCH = withAuth(async (request, authUser, context) => {
    return handleApi(async () => {
      const { companyId, branchId, userId } = authUser
      const params = await Promise.resolve((context as any)?.params)
      const accountId = params?.id
      
      const body = await parseJsonBody(request)
      const db = getDatabase()
      
      // Dinamik güncelleme (basit hali)
      const updates = Object.entries(body)
        .filter(([k]) => ['name', 'email', 'phone', 'address', 'risk_limit', 'discount_rate', 'authorized_person_name'].includes(k))
        .map(([k]) => `${k} = ?`)
        .join(', ')
      
      if (!updates) return fail('Güncellenecek veri bulunamadı')
      
      const values = Object.entries(body)
        .filter(([k]) => ['name', 'email', 'phone', 'address', 'risk_limit', 'discount_rate', 'authorized_person_name'].includes(k))
        .map(([, v]) => v)
      
      db.prepare(`UPDATE accounts SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, accountId)
      
      return ok(null, { message: 'Cari hesap güncellendi' })
    })
})
