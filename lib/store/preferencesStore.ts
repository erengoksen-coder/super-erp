'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getSafeStorage } from '@/lib/store/safeStorage'

export type Language = 'tr' | 'en'

export type NotificationSoundPreference = boolean

type PreferencesState = {
  language: Language
  setLanguage: (language: Language) => void
  notificationSound: NotificationSoundPreference
  setNotificationSound: (v: NotificationSoundPreference) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      language: 'tr',
      setLanguage: (language) => set({ language }),
      notificationSound: true,
      setNotificationSound: (v) => set({ notificationSound: v }),
    }),
    {
      name: 'preferences',
      storage: createJSONStorage(() => getSafeStorage()),
    }
  )
)
