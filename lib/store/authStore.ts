'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type AuthUser = {
  id: string
  username: string
  email?: string | null
  full_name?: string | null
  role: string
  job_title?: string | null
}

type AuthState = {
  token: string | null
  user: AuthUser | null
  hydrated: boolean
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
  setHydrated: (hydrated: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setAuth: (token, user) => set({ token, user }),
      clearAuth: () => set({ token: null, user: null }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    }
  )
)
