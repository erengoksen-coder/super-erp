import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { pushSubscriptionsRepo } from '@/lib/repositories/pushSubscriptions'

type UnsubscribeBody = {
  endpoint?: string
}

export async function POST(request: NextRequest) {
  return handleApi(async () => {
    const body = await request.json() as UnsubscribeBody
    if (!body.endpoint) {
      return fail('Endpoint gerekli', { status: 400 })
    }

    pushSubscriptionsRepo.removeByEndpoint(body.endpoint)

    return ok({ unsubscribed: true })
  })
}
