'use client'

import { createContext, useContext, useCallback, useMemo } from 'react'
import { useUIStore } from '@/lib/store/uiStore'

type SidebarContextValue = {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, setSidebarCollapsed, toggleSidebar } = useUIStore()

  const value = useMemo(() => ({
    collapsed: sidebarCollapsed,
    setCollapsed: setSidebarCollapsed,
    toggle: toggleSidebar
  }), [sidebarCollapsed, setSidebarCollapsed, toggleSidebar])

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  const { sidebarCollapsed, setSidebarCollapsed, toggleSidebar } = useUIStore()
  
  if (ctx) return ctx
  
  return { 
    collapsed: sidebarCollapsed, 
    setCollapsed: setSidebarCollapsed, 
    toggle: toggleSidebar 
  }
}
