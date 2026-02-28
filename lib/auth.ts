/**
 * Basit Auth Helper
 * Gerçek uygulamada JWT veya session kullanılmalı
 */

import { useAuthStore } from '@/lib/store/authStore'

export function getUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null
}

export function getUserRole(): string | null {
  return useAuthStore.getState().user?.role ?? null
}

export function isAuthenticated(): boolean {
  return !!useAuthStore.getState().user
}

export function isAdmin(): boolean {
  return useAuthStore.getState().user?.role === 'admin'
}

export function getUserName(): string | null {
  const user = useAuthStore.getState().user
  return user?.full_name || user?.username || null
}

export function getCurrentUserFromStore() {
  const user = useAuthStore.getState().user
  if (!user) return null
  return {
    id: user.id,
    name: user.full_name || user.username,
    username: user.username,
    role: user.role,
  }
}

export async function createClient() {
  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user
}

let isLoggingOutFlag = false

export async function logout() {
  // Çift tıklama veya çoklu çağrıları engelle
  if (isLoggingOutFlag) {
    return
  }

  isLoggingOutFlag = true

  try {
    // 1. Sunucu taraflı session ve HttpOnly cookie'leri temizle (Max 1.5 sn bekle)
    const logoutPromise = fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.error('Logout API error:', err))

    await Promise.race([
      logoutPromise,
      new Promise(resolve => setTimeout(resolve, 1500))
    ])

    // 2. Lokal state'i temizle
    const clearAuth = useAuthStore.getState().clearAuth
    clearAuth()

    if (typeof window !== 'undefined') {
      // 3. localStorage'daki tokenları temizle (isteğe bağlı ama güvenli)
      localStorage.removeItem('auth-token')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      sessionStorage.setItem('logging_out', 'true')

      // 4. Giriş sayfasına yönlendir
      window.location.href = '/auth/login'
    }
  } catch (error) {
    console.error('Logout error:', error)
    // Hata olsa bile en azından yönlendirmeyi dene
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
  } finally {
    // Flag'i temizle (yönlendirme olmazsa veya hata durumunda)
    setTimeout(() => {
      isLoggingOutFlag = false
    }, 2000)
  }
}




