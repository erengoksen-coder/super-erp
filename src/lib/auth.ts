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

let isLoggingOut = false

export function logout() {
  // Çift tıklama veya çoklu çağrıları engelle
  if (isLoggingOut) {
    return
  }
  
  isLoggingOut = true
  
  const clearAuth = useAuthStore.getState().clearAuth
  clearAuth()
  
  if (typeof window !== 'undefined') {
    // localStorage'da logout flag'i set et
    sessionStorage.setItem('logging_out', 'true')
    
    // JWT tabanlı sistemde logout API'sine istek atmaya gerek yok
    // Sadece local state temizle ve yönlendir
    window.location.href = '/auth/login'
    
    // Flag'i temizle (yönlendirme sonrası)
    setTimeout(() => {
      sessionStorage.removeItem('logging_out')
      isLoggingOut = false
    }, 1000)
  }
}




