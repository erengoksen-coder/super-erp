'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getSafeStorage } from '@/lib/store/safeStorage'

export interface DashboardConfig {
  aiAdvisor: boolean
  recentViews: boolean
  quickActions: boolean
  kpis: boolean
  financial: boolean
  liveStatus: boolean
  orders: boolean
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  aiAdvisor: true,
  recentViews: true,
  quickActions: true,
  kpis: true,
  financial: true,
  liveStatus: true,
  orders: true,
}

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  toggleSidebar: () => void

  // Dashboard
  dashboardConfig: DashboardConfig
  setDashboardConfig: (config: DashboardConfig) => void
  toggleDashboardSection: (key: keyof DashboardConfig) => void

  // Command Palette
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (v: boolean) => void
  toggleCommandPalette: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Dashboard
      dashboardConfig: DEFAULT_DASHBOARD_CONFIG,
      setDashboardConfig: (config) => set({ dashboardConfig: config }),
      toggleDashboardSection: (key) =>
        set((state) => ({
          dashboardConfig: {
            ...state.dashboardConfig,
            [key]: !state.dashboardConfig[key],
          },
        })),

      // Command Palette
      commandPaletteOpen: false,
      setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
      toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
    }),
    {
      name: 'erp-ui-state',
      storage: createJSONStorage(() => getSafeStorage()),
    }
  )
)
