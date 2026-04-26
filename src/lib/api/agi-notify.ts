'use client'

import { toast, Toaster } from 'sonner'

/**
 * CLIENT-ONLY API NOTIFICATIONS
 * This file uses 'sonner' and must only be imported in Client Components.
 */

export async function fetchAction<T>(
  promise: Promise<T>,
  options: {
    loading?: string
    success?: string
    error?: string
    onSettled?: () => void
  } = {}
) {
  const { loading = 'İşlem yapılıyor...', success = 'İşlem başarıyla tamamlandı', error = 'Bir hata oluştu' } = options
  try {
    const id = toast.loading(loading)
    const result = await promise
    toast.dismiss(id)
    toast.success(success)
    options.onSettled?.()
    return result
  } catch (err: unknown) {
    toast.dismiss()
    const message = err instanceof Error ? err.message : (err as { error?: string })?.error || error
    toast.error(message)
    console.error('[fetchAction] Error:', err)
    return null
  }
}
