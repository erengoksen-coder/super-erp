import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { ok, fail } from '@/lib/api/response'
import { apiService } from '@/lib/services/api-service'
import { apiTokenSchema } from '@/lib/validation/api-schema'

/**
 * GET: Tüm API anahtarlarını listele
 */
export const GET = withAuth(async (_request: NextRequest, authUser) => {
  try {
    const tokens = await apiService.getTokens(authUser.companyId)
    return ok(tokens)
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}, ['admin'])

/**
 * POST: Yeni API anahtarı ekle
 */
export const POST = withAuth(async (request: NextRequest, authUser) => {
  try {
    const body = await parseJsonBody(request)
    const result = apiTokenSchema.safeParse(body)

    if (!result.success) {
      return fail(result.error.errors[0].message, { status: 400 })
    }

    const res = await apiService.createToken(
      authUser.companyId, 
      authUser.userId, 
      authUser.branchId, 
      result.data
    )
    
    return ok(res, { message: 'API Anahtarı başarıyla oluşturuldu' })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}, ['admin'])

/**
 * DELETE: API Anahtarını iptal et
 */
export const DELETE = withAuth(async (request: NextRequest, authUser) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return fail('ID gerekli', { status: 400 })

    await apiService.deleteToken(id, authUser.companyId)
    return ok(null, { message: 'API Anahtarı silindi' })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}, ['admin'])
