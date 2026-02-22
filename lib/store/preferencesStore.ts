'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getSafeStorage } from '@/lib/store/safeStorage'

export type Language = 'tr' | 'en'

export type NotificationSoundPreference = boolean

export type NotificationTypesPreference = {
  criticalStock: boolean
  shipmentApproved: boolean
  newOrder: boolean
  orderStatusChange: boolean
  purchaseRequest: boolean
}

const DEFAULT_NOTIFICATION_TYPES: NotificationTypesPreference = {
  criticalStock: true,
  shipmentApproved: true,
  newOrder: true,
  orderStatusChange: false,
  purchaseRequest: true,
}

type PreferencesState = {
  language: Language
  setLanguage: (language: Language) => void
  notificationSound: NotificationSoundPreference
  setNotificationSound: (v: NotificationSoundPreference) => void
  notificationTypes: NotificationTypesPreference
  setNotificationType: (key: keyof NotificationTypesPreference, value: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      language: 'tr',
      setLanguage: (language) => set({ language }),
      notificationSound: true,
      setNotificationSound: (v) => set({ notificationSound: v }),
      notificationTypes: DEFAULT_NOTIFICATION_TYPES,
      setNotificationType: (key, value) =>
        set((s) => ({
          notificationTypes: { ...s.notificationTypes, [key]: value },
        })),
    }),
    {
      name: 'preferences',
      storage: createJSONStorage(() => getSafeStorage()),
      merge: (persisted, current) => {
        const p = persisted as Partial<PreferencesState> | undefined
        if (!p || typeof p !== 'object') return current
        return {
          ...current,
          ...p,
          notificationTypes: {
            ...DEFAULT_NOTIFICATION_TYPES,
            ...(p.notificationTypes && typeof p.notificationTypes === 'object' ? p.notificationTypes : {}),
          },
        }
      },
    }
  )
)
