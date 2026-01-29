'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { fetchApi } from '@/lib/api/client'

const publicPaths = ['/auth/login', '/auth/register']

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const hydrated = useAuthStore((state) => state.hydrated)
  const setAuth = useAuthStore((state) => state.setAuth)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  useEffect(() => {
    // Public sayfalar için kontrol yapma
    if (publicPaths.includes(pathname || '')) {
      setIsChecking(false)
      return
    }

    if (!hydrated) {
      return
    }

    const verifySession = async () => {
      try {
        const data = await fetchApi('/api/auth/me')
        const fetchedUser = (data as any)?.user ?? (data as any)?.data?.user
        if (!fetchedUser) {
          throw new Error('Oturum bulunamadı')
        }
        setAuth(fetchedUser)
      } catch {
        try {
          await fetchApi('/api/auth/refresh', { method: 'POST' })
          const refreshed = await fetchApi('/api/auth/me')
          const refreshedUser = (refreshed as any)?.user ?? (refreshed as any)?.data?.user
          if (!refreshedUser) {
            throw new Error('Oturum bulunamadı')
          }
          setAuth(refreshedUser)
          return
        } catch {
          clearAuth()
          if (typeof window !== 'undefined' && pathname !== '/auth/login') {
            window.location.href = '/auth/login'
            return
          }
        }
      } finally {
        setIsChecking(false)
      }
    }
    verifySession()
  }, [pathname, hydrated, setAuth, clearAuth])

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


