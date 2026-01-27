/**
 * Basit Auth Helper
 * Gerçek uygulamada JWT veya session kullanılmalı
 */

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

export function getUserId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('user_id')
}

export function getUserRole(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('user_role')
}

export function isAuthenticated(): boolean {
  return !!getAuthToken()
}

export function isAdmin(): boolean {
  return getUserRole() === 'admin'
}

export function getUserName(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('user_name')
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null
  return {
    id: getUserId(),
    name: getUserName(),
    username: getUserName(),
    role: getUserRole(),
  }
}

export function logout() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user_id')
  localStorage.removeItem('user_role')
  localStorage.removeItem('user_name')
  window.location.href = '/auth/login'
}

