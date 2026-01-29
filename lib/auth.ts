/**
 * Basit Auth Helper
 * Gerçek uygulamada JWT veya session kullanılmalı
 */

import { useAuthStore } from '@/lib/store/authStore'
import { fetchApi } from '@/lib/api/client'

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

export function getCurrentUser() {
  const user = useAuthStore.getState().user
  if (!user) return null
  return {
    id: user.id,
    name: user.full_name || user.username,
    username: user.username,
    role: user.role,
  }
}

export function logout() {
  const clearAuth = useAuthStore.getState().clearAuth
  clearAuth()
  if (typeof window !== 'undefined') {
    fetchApi('/api/auth/logout', { method: 'POST' }).catch(() => {})
    window.location.href = '/auth/login'
  }
}

