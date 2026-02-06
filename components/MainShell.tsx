"use client"

import { useLayoutEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import PendingUsersBanner from '@/components/PendingUsersBanner'
import NotificationToaster from '@/components/NotificationToaster'
import MessengerBox from '@/components/MessengerBox'
import { useSidebar } from '@/components/SidebarContext'

type MainShellProps = {
  children: React.ReactNode
}

export default function MainShell({ children }: MainShellProps) {
  const pathname = usePathname()
  const mainRef = useRef<HTMLElement | null>(null)
  const { collapsed } = useSidebar()

  useLayoutEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0
      mainRef.current.scrollLeft = 0
    }
  }, [pathname])

  const isAuthPage = pathname === '/auth/login' || pathname === '/auth/register'
  const isProductionRoute = pathname.startsWith('/production')

  return (
    <main
      id="app-main"
      ref={mainRef}
      style={{
        backgroundColor: '#0f172a',
        color: '#f1f5f9',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
      className={cn(
        'fixed inset-0 overscroll-contain box-border transition-[left] duration-300',
        !isAuthPage && (collapsed ? 'lg:left-[72px]' : 'lg:left-64')
      )}
    >
      <div className={cn(
        // Production: full-width with consistent padding
        isProductionRoute && "w-full p-6",
        // Other pages: container with responsive padding
        !isProductionRoute && "p-3 sm:p-4 md:p-6 lg:p-8"
      )}>
        {!isAuthPage && (
          <>
            <PendingUsersBanner />
            <NotificationToaster />
            <MessengerBox />
          </>
        )}
        {children}
      </div>
    </main>
  )
}
