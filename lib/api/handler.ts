import { fail } from '@/lib/api/response'
import { apiLogger } from '@/lib/api/logger'

export async function handleApi<T>(handler: () => Promise<T>, context?: { status?: number }) {
  try {
    return await handler()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen hata'
    const status = error && typeof (error as { status?: number }).status === 'number'
      ? (error as { status: number }).status
      : context?.status ?? 500
    apiLogger.error('[API] Unhandled error', {
      message,
      stack: error instanceof Error ? error.stack : undefined,
    })
    return fail(message, { status })
  }
}
