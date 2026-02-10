'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { fetchApi, clearStoredAuthToken } from '@/lib/api/client'
import { canAccessPath, isAdminRole } from '@/lib/auth/permissions-check'
import { ROUTES } from '@/lib/constants'

const publicPaths = [ROUTES.LOGIN, ROUTES.REGISTER, '/durum']
const VERIFY_THROTTLE_MS = 3000

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const hydrated = useAuthStore((state) => state.hydrated)
  const setAuth = useAuthStore((state) => state.setAuth)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const user = useAuthStore((state) => state.user)
  const lastVerifyRef = useRef<number>(0)

  useEffect(() => {
    // Public sayfalar için kontrol yapma
    if (publicPaths.includes(pathname || '')) {
      setIsChecking(false)
      return
    }

    if (!hydrated) {
      return
    }

    // Eğer logout işlemi devam ediyorsa, session kontrolü yapma
    if (typeof window !== 'undefined' && sessionStorage.getItem('logging_out') === 'true') {
      setIsChecking(false)
      return
    }

    const now = Date.now()
    if (now - lastVerifyRef.current < VERIFY_THROTTLE_MS) {
      setIsChecking(false)
      return
    }
    lastVerifyRef.current = now

    const verifySession = async () => {
      try {
        const data = await fetchApi('/api/auth/me')
        const fetchedUser = (data as any)?.user ?? (data as any)?.data?.user
        if (!fetchedUser) {
          throw new Error('Oturum bulunamadı')
        }
        setAuth(fetchedUser)
      } catch (err: unknown) {
        const msg = String((err as Error)?.message ?? '')
        if (msg.includes('429') || msg.includes('Too Many Requests')) {
          setIsChecking(false)
          return
        }
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
          clearStoredAuthToken()
          if (typeof window !== 'undefined' && pathname !== ROUTES.LOGIN) {
            window.location.href = ROUTES.LOGIN
            return
          }
        }
      } finally {
        setIsChecking(false)
      }
    }
    verifySession()
  }, [pathname, hydrated, setAuth, clearAuth])

  useEffect(() => {
    if (!hydrated || isChecking || publicPaths.includes(pathname || '')) {
      return
    }
    if (!user) {
      return
    }
    const isAdmin = isAdminRole(user.role)
    const normalizedPath = pathname || '/'
    const isBayiPortal = normalizedPath === '/bayi' || normalizedPath.startsWith('/bayi/')
    const isBayiUser = (user.role || '').toString().trim().toLowerCase() === 'bayi'
    if (isBayiPortal && isBayiUser) {
      return
    }
    if (!isAdmin) {
      const permissions = user.permissions || []
      const isOrdersChild =
        normalizedPath === '/sales-orders' ||
        normalizedPath.startsWith('/sales-orders/') ||
        normalizedPath === '/purchase-orders' ||
        normalizedPath.startsWith('/purchase-orders/')
      const hasOrdersAccess = canAccessPath(permissions, '/orders', 'view')
      if (isOrdersChild && hasOrdersAccess) {
        return
      }
      if (!canAccessPath(permissions, normalizedPath, 'view') && !(isBayiPortal && isBayiUser)) {
        if (typeof window !== 'undefined') {
          window.location.href = '/'
        }
      }
    }
  }, [hydrated, isChecking, pathname, user])

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


