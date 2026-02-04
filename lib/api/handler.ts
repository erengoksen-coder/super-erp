import { fail } from '@/lib/api/response'
import { logger } from '@/lib/utils/logger'

export async function handleApi<T>(handler: () => Promise<T>, context?: { status?: number }) {
  try {
    return await handler()
  } catch (error: any) {
    const message = error?.message || 'Beklenmeyen hata'
    const status = typeof error?.status === 'number' ? error.status : context?.status || 500
    try {
      await logger.error('[API] Unhandled error', {
        message,
        stack: error?.stack,
      })
    } catch {
      // logging failure should not break API responses
    }
    return fail(message, { status })
  }
}
