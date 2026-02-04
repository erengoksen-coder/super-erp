'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getSafeStorage } from '@/lib/store/safeStorage'

export type Language = 'tr' | 'en'

type PreferencesState = {
  language: Language
  setLanguage: (language: Language) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      language: 'tr',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'preferences',
      storage: createJSONStorage(() => getSafeStorage()),
    }
  )
)
