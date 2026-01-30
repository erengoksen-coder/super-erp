import { ok } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'
import { handleApi } from '@/lib/api/handler'
import { getVapidPublicKey } from '@/lib/notifications/push'

export const GET = withAuth(async (request) => {
  return handleApi(async () => {
    const publicKey = getVapidPublicKey()
    return ok({ publicKey })
  })
})
