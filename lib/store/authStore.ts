'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getSafeStorage } from '@/lib/store/safeStorage'

export type AuthUser = {
  id: string
  username: string
  email?: string | null
  full_name?: string | null
  role: string
  job_title?: string | null
  permissions?: Array<{
    page_path: string
    can_view: number
    can_create: number
    can_edit: number
    can_delete: number
  }>
}

type AuthState = {
  user: AuthUser | null
  hydrated: boolean
  setAuth: (user: AuthUser | null) => void
  clearAuth: () => void
  setHydrated: (hydrated: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      setAuth: (user) => set({ user }),
      clearAuth: () => set({ user: null }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => getSafeStorage()),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    }
  )
)
