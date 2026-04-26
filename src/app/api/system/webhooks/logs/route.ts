import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { apiService } from '@/lib/services/api-service'

/**
 * GET: Webhook gönderim günlüklerini listele
 */
export const GET = withAuth(async (request: NextRequest, authUser) => {
  try {
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('webhook_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    const logs = await apiService.getWebhookLogs(authUser.companyId, webhookId || undefined, limit)
    return ok(logs)
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}, ['admin'])
