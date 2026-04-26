'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getSafeStorage } from '@/lib/store/safeStorage'

/** Sabit ID'ler: EKLENEBILECEKLER listesindeki yenilikler (tek seferlik kırmızı vurgu) */
export const NEW_FEATURE_IDS = [
  'overdue_orders_alert',      // 9.4
  'critical_stock_alert',
  'pending_approval_alert',
  'notification_purchase_request', // 1.3
  'aging_export',              // 2.6
  'cari_fatura_arama',         // 1.1
  'pwa_hint',                  // 5.1
  'bakim_modu',                // 3.3
] as const

export type NewFeatureId = (typeof NEW_FEATURE_IDS)[number]

type SeenFeaturesState = {
  seenIds: string[]
  markSeen: (id: string) => void
  isSeen: (id: string) => boolean
}

export const useSeenFeaturesStore = create<SeenFeaturesState>()(
  persist(
    (set, get) => ({
      seenIds: [],
      markSeen: (id) =>
        set((s) =>
          s.seenIds.includes(id) ? s : { seenIds: [...s.seenIds, id] }
        ),
      isSeen: (id) => get().seenIds.includes(id),
    }),
    {
      name: 'erp-seen-features',
      storage: createJSONStorage(() => getSafeStorage()),
    }
  )
)
