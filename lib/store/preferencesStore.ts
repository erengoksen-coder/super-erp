'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

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
      storage: createJSONStorage(() => localStorage),
    }
  )
)
