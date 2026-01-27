'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'

const publicPaths = ['/auth/login', '/auth/register']

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const token = useAuthStore((state) => state.token)
  const hydrated = useAuthStore((state) => state.hydrated)

  useEffect(() => {
    // Public sayfalar için kontrol yapma
    if (publicPaths.includes(pathname || '')) {
      setIsChecking(false)
      return
    }

    // Auth kontrolü
    if (hydrated && !token) {
      // window.location kullanarak kesin yönlendirme (göreli URL kullan)
      if (typeof window !== 'undefined' && pathname !== '/auth/login') {
        window.location.href = '/auth/login'
        return
      }
    }

    setIsChecking(false)
  }, [pathname, token, hydrated])

  // Public sayfalar veya authenticated kullanıcılar için içeriği göster
  if (publicPaths.includes(pathname || '')) {
    return <>{children}</>
  }

  if (isChecking || !hydrated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}


