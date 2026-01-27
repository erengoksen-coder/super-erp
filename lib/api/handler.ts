import { fail } from '@/lib/api/response'

export async function handleApi<T>(handler: () => Promise<T>, context?: { status?: number }) {
  try {
    return await handler()
  } catch (error: any) {
    const message = error?.message || 'Beklenmeyen hata'
    return fail(message, { status: context?.status || 500 })
  }
}
