import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { ok, fail } from '@/lib/api/response'
import { apiService } from '@/lib/services/api-service'

/**
 * POST: Bir webhook'u test et
 * Gönderilen ID'ye sahip webhook'a ping atar ve sonucu döner.
 */
export const POST = withAuth(async (request: NextRequest, authUser) => {
  try {
    const body = await parseJsonBody(request)
    const { id } = body

    if (!id) return fail('Webhook ID gerekli', { status: 400 })

    const result = await apiService.testWebhook(authUser.companyId, id)
    
    if (result.statusCode >= 200 && result.statusCode < 300) {
      return ok(result, { message: `Test başarılı (HTTP ${result.statusCode})` })
    } else {
      return fail(`Test başarısız (HTTP ${result.statusCode})`, { status: 400, details: result })
    }
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}, ['admin'])
