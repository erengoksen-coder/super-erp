'use client'

import React, { useEffect, useState } from 'react'
import { ThemeProvider } from '@/lib/theme'
import { SWRConfig } from 'swr'
import AuthGuard from '@/components/AuthGuard'
import GlobalBarcodeListener from '@/components/GlobalBarcodeListener'
import ScrollToTop from '@/components/ScrollToTop'
import { Toaster } from 'sonner'
import { SidebarProvider } from '@/components/SidebarContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import PageTransition from '@/components/PageTransition'
import SuppressHydrationWarnings from '@/app/suppress-hydration-warnings'
import dynamic from 'next/dynamic'

// Use dynamic for heavy shell components
const Sidebar = dynamic(() => import('@/components/Sidebar'), { ssr: false })
const MainShell = dynamic(() => import('@/components/MainShell'), { ssr: false })

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
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
          <GlobalBarcodeListener />
          <ScrollToTop />
          <Toaster richColors position="top-right" closeButton />
          <SidebarProvider>
            <ErrorBoundary>
              <Sidebar />
            </ErrorBoundary>
            <MainShell>
              <ErrorBoundary>
                <PageTransition>{children}</PageTransition>
              </ErrorBoundary>
            </MainShell>
          </SidebarProvider>
        </AuthGuard>
      </SWRConfig>
    </ThemeProvider>
  )
}
