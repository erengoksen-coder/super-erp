import { ok } from '@/lib/api/response'
import { handleApi } from '@/lib/api/handler'
import { getVapidPublicKey } from '@/lib/notifications/push'

export async function GET() {
  return handleApi(async () => {
    const publicKey = getVapidPublicKey()
    return ok({ publicKey })
  })
}
