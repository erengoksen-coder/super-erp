'use client'

import React, { useState, useEffect } from 'react'
import { ThemeProvider } from '@/lib/theme'
import { SWRConfig } from 'swr'
import AuthGuard from '@/components/AuthGuard'
import ScrollToTop from '@/components/ScrollToTop'
import { Toaster } from 'sonner'
import { SidebarProvider } from '@/components/SidebarContext'
import MainShell from '@/components/MainShell'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PerformanceMetrics } from '@/lib/performance'
import SuppressHydrationWarnings from '@/app/suppress-hydration-warnings'
import dynamic from 'next/dynamic'

// Complex components that are isolated for stability
const Sidebar = dynamic(() => import('@/components/Sidebar'), { ssr: false })

/**
 * Platinum Providers Component
 * Organizes the application provider tree for optimal hydration and performance.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Show a minimal, stable skeleton during server render & initial mount
    return (
      <ThemeProvider>
        <div className="bg-slate-950 min-h-screen" />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <SWRConfig value={{
        revalidateOnFocus: false,
        shouldRetryOnError: false
      }}>
        <AuthGuard>
          <SuppressHydrationWarnings />
          <ScrollToTop />
          <Toaster richColors position="top-right" closeButton />
          <PerformanceMetrics />
          <SidebarProvider>
            <ErrorBoundary>
              <Sidebar />
            </ErrorBoundary>
            <MainShell>
              <ErrorBoundary>{children}</ErrorBoundary>
            </MainShell>
          </SidebarProvider>
        </AuthGuard>
      </SWRConfig>
    </ThemeProvider>
  )
}
