import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { ok, fail } from '@/lib/api/response'
import { apiService } from '@/lib/services/api-service'
import { webhookSchema } from '@/lib/validation/api-schema'

/**
 * GET: Tüm webhook'ları listele
 */
export const GET = withAuth(async (_request: NextRequest, authUser) => {
  try {
    const webhooks = await apiService.getWebhooks(authUser.companyId)
    return ok(webhooks)
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}, ['admin'])

/**
 * POST: Yeni webhook ekle
 */
export const POST = withAuth(async (request: NextRequest, authUser) => {
  try {
    const body = await parseJsonBody(request)
    const result = webhookSchema.safeParse(body)

    if (!result.success) {
      return fail(result.error.errors[0].message, { status: 400 })
    }

    const res = await apiService.createWebhook(authUser.companyId, result.data)
    return ok(res, { message: 'Webhook başarıyla eklendi' })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}, ['admin'])

/**
 * DELETE: Webhook sil
 */
export const DELETE = withAuth(async (request: NextRequest, authUser) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return fail('ID gerekli', { status: 400 })

    await apiService.deleteWebhook(id, authUser.companyId)
    return ok(null, { message: 'Webhook silindi' })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}, ['admin'])
