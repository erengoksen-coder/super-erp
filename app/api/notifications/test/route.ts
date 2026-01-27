import { ok } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { sendPush } from '@/lib/notifications/push'
import { pushSubscriptionsRepo } from '@/lib/repositories/pushSubscriptions'

export async function POST() {
  return handleApi(async () => {
    const subscriptions = pushSubscriptionsRepo.list()

    let sent = 0
    let removed = 0

    for (const sub of subscriptions) {
      try {
        await sendPush(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          {
            title: 'Super ERP',
            body: 'Test bildirimi',
            url: '/',
          }
        )
        sent += 1
      } catch (error: any) {
        const status = error?.statusCode
        if (status === 404 || status === 410) {
          pushSubscriptionsRepo.removeById(sub.id)
          removed += 1
        }
      }
    }

    return ok({ sent, removed })
  })
}
