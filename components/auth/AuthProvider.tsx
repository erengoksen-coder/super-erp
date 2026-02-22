'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuthStore, type AuthUser } from '@/lib/store/authStore'

interface AuthContextType {
  user: AuthUser | null
  hydrated: boolean
  login: (userData: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, hydrated, setAuth, clearAuth } = useAuthStore()

  const login = (userData: AuthUser) => {
    setAuth(userData)
  }

  const logout = async () => {
    try {
      // Call logout API to clear server-side session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // Always clear local auth state
      clearAuth()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        hydrated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth yalnızca AuthProvider içinde kullanılabilir')
  }
  return context
}