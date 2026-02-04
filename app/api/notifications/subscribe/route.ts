import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { randomUUID } from 'crypto'
import { ok, fail } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { pushSubscriptionsRepo } from '@/lib/repositories/pushSubscriptions'

type SubscriptionBody = {
  subscription?: {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }
  user_id?: string | null
}

export const POST = withAuth(async (request: NextRequest) => {
  return handleApi(async () => {
    const body = await parseJsonBody(request) as SubscriptionBody
    const subscription = body.subscription
    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return fail('Geçersiz abonelik verisi', { status: 400 })
    }

    const id = randomUUID()
    const userId = body.user_id || null

    pushSubscriptionsRepo.upsert({
      id,
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })

    return ok({ subscribed: true })
  })
})

