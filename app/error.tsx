'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.console) {
      console.error('Route segment hatası:', error)
    }
  }, [error])

  return (
    <div className="min-h-[280px] flex flex-col items-center justify-center gap-4 p-8 bg-gray-900 border border-gray-700 rounded-xl mx-4 my-6">
      <AlertTriangle className="w-14 h-14 text-amber-500 shrink-0" />
      <h2 className="text-xl font-semibold text-white text-center">Bir hata oluştu</h2>
      <p className="text-sm text-gray-400 text-center max-w-md">
        {error?.message || 'Beklenmeyen bir sorun oluştu. Sayfayı yenileyerek tekrar deneyebilirsiniz.'}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
      >
        <RefreshCw className="w-4 h-4" />
        Yeniden dene
      </button>
      <button
        type="button"
        onClick={() => window.location.href = '/'}
        className="text-sm text-gray-500 hover:text-gray-300 transition"
      >
        Ana sayfaya dön
      </button>
    </div>
  )
}
