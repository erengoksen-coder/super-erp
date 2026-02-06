'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'sidebar-collapsed'

type SidebarContextValue = {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) setCollapsedState(stored === 'true')
    } catch {}
  }, [])

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value)
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {}
  }, [])

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {}
      return next
    })
  }, [])

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  return ctx ?? { collapsed: false, setCollapsed: () => {}, toggle: () => {} }
}
