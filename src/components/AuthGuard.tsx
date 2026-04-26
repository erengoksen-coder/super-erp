'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore, type AuthUser } from '@/lib/store/authStore'
import { fetchApi, clearStoredAuthToken } from '@/lib/api/client'
import type { AuthMeResponse } from '@/types'
import { canAccessPath, isAdminRole } from '@/lib/auth/permissions-check'
import { ROUTES } from '@/lib/constants'

const publicPaths = [ROUTES.LOGIN, ROUTES.REGISTER, '/durum']
const VERIFY_THROTTLE_MS = 3000

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [hasError, setHasError] = useState(false)
  const hydrated = useAuthStore((state) => state.hydrated)
  const setAuth = useAuthStore((state) => state.setAuth)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const user = useAuthStore((state) => state.user)
  const lastVerifyRef = useRef<number>(0)
  const timeoutRef = useRef<any>(null)

  const verifySession = async () => {
    setIsChecking(true)
    setHasError(false)
    
    // Clear any existing timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    // Set a safety timeout for 12 seconds
    timeoutRef.current = setTimeout(() => {
      setHasError(true)
    }, 12000)

    try {
      const data = await fetchApi<AuthMeResponse>('/api/auth/me')
      const fetchedUser = data?.user ?? data?.data?.user
      if (!fetchedUser) {
        throw new Error('Oturum bulunamadı')
      }
      setAuth({
        ...fetchedUser,
        id: fetchedUser.id,
        username: fetchedUser.username,
        role: fetchedUser.role ?? '',
      } as AuthUser)
    } catch (err: unknown) {
      const msg = String((err as Error)?.message ?? '')
      if (msg.includes('429') || msg.includes('Too Many Requests')) {
        setIsChecking(false)
        return
      }
      try {
        await fetchApi('/api/auth/refresh', { method: 'POST' })
        const refreshed = await fetchApi<AuthMeResponse>('/api/auth/me')
        const refreshedUser = refreshed?.user ?? refreshed?.data?.user
        if (!refreshedUser) {
          throw new Error('Oturum bulunamadı')
        }
        setAuth({
          ...refreshedUser,
          id: refreshedUser.id,
          username: refreshedUser.username,
          role: refreshedUser.role ?? '',
        } as AuthUser)
        return
      } catch {
        clearAuth()
        clearStoredAuthToken()
        if (typeof window !== 'undefined' && pathname !== ROUTES.LOGIN) {
          window.location.href = ROUTES.LOGIN
        }
      }
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setIsChecking(false)
    }
  }

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

    verifySession()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [pathname, hydrated]) // Removed setAuth, clearAuth as they are stable from store

  useEffect(() => {
    if (!hydrated || isChecking || publicPaths.includes(pathname || '')) {
      return
    }
    if (!user) {
      return
    }
    const isAdmin = isAdminRole(user.role)
    const normalizedPath = pathname || '/'
    const isBayiUser = (user.role || '').toString().trim().toLowerCase() === 'bayi'

    if (isBayiUser && normalizedPath === '/') {
      if (typeof window !== 'undefined') {
        window.location.href = '/bayi/dashboard'
        return
      }
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
      if (!isBayiUser && !canAccessPath(permissions, normalizedPath, 'view')) {
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
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-8 overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 text-center space-y-8 animate-reveal">
           {/* Logo / Icon */}
           <div className="mx-auto w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-glow shadow-primary/10">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
           </div>

           <div className="space-y-4">
              <h1 className="text-xl font-black text-white uppercase tracking-[0.5em] italic">ERPLATINUM</h1>
              <div className="flex items-center justify-center gap-3">
                 <div className="h-[1px] w-8 bg-white/10" />
                 <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest italic">OTURUM DOĞRULANIYOR</p>
                 <div className="h-[1px] w-8 bg-white/10" />
              </div>
           </div>

           <div className="max-w-[200px] mx-auto h-0.5 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-primary animate-shimmer" style={{ width: hasError ? '100%' : '40%' }} />
           </div>

           {hasError && (
             <div className="pt-4 animate-reveal">
                <p className="text-[10px] text-red-500/60 mb-4 font-medium uppercase tracking-widest">
                  SUNUCU YANIT VERMEDİ
                </p>
                <button 
                  onClick={() => verifySession()}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] text-white font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                >
                  YENİDEN DENE
                </button>
             </div>
           )}
        </div>

        <div className="absolute bottom-12 text-[9px] font-black text-white/10 uppercase tracking-[0.3em] italic">
           SÜPER ERP v4.0 • GÜVENLİ ERİŞİM
        </div>
      </div>
    )
  }

  return <>{children}</>
}


