'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getSafeStorage } from '@/lib/store/safeStorage'

/**
 * Super ERP - Accounting Store
 * Manages chart of accounts, fiscal periods, and active currency state.
 */

export type Account = {
  id: string
  code: string
  name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  parent_id?: string | null
  balance?: number
}

type AccountState = {
  activeFiscalYear: number
  currency: string
  accounts: Account[]
  setFiscalYear: (year: number) => void
  setCurrency: (currency: string) => void
  setAccounts: (accounts: Account[]) => void
  clearAccountData: () => void
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      activeFiscalYear: new Date().getFullYear(),
      currency: 'TRY',
      accounts: [],
      setFiscalYear: (activeFiscalYear) => set({ activeFiscalYear }),
      setCurrency: (currency) => set({ currency }),
      setAccounts: (accounts) => set({ accounts }),
      clearAccountData: () => set({ accounts: [], activeFiscalYear: new Date().getFullYear() }),
    }),
    {
      name: 'accounting-storage',
      storage: createJSONStorage(() => getSafeStorage()),
    }
  )
)