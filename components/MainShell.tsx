"use client"

import { useLayoutEffect, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import PendingUsersBanner from '@/components/PendingUsersBanner'
import NotificationToaster from '@/components/NotificationToaster'
import BayiOrderAlertBanner from '@/components/BayiOrderAlertBanner'
import MessengerBox from '@/components/MessengerBox'
import AiChatbot from '@/components/ui/AiChatbot'
import { useSidebar } from '@/components/SidebarContext'
import { useAuthStore } from '@/lib/store/authStore'
import { fetchApi } from '@/lib/api/client'
import { ROUTES } from '@/lib/constants'

const HEARTBEAT_MS = 2 * 60 * 1000 // 2 dakikada bir çevrimiçi kal

type MainShellProps = {
  children: React.ReactNode
}

export default function MainShell({ children }: MainShellProps) {
  const pathname = usePathname()
  const mainRef = useRef<HTMLElement | null>(null)
  const { collapsed } = useSidebar()
  const user = useAuthStore((s) => s.user)

  // Giriş yapmış kullanıcı: periyodik ping ile "çevrimiçi" görünsün (Kullanıcı listesi / Mesajlaşma)
  // İlk ping 2sn gecikmeli: HMR/Strict Mode mount sırasında abort olup "Fetch failed" logunu azaltır
  useEffect(() => {
    if (!user || pathname === ROUTES.LOGIN || pathname === ROUTES.REGISTER) return
    const ping = () => fetchApi('/api/auth/ping').catch(() => {})
    let intervalId: ReturnType<typeof setInterval>
    const startId = setTimeout(() => {
      ping()
      intervalId = setInterval(ping, HEARTBEAT_MS)
    }, 2000)
    return () => {
      clearTimeout(startId)
      clearInterval(intervalId!)
    }
  }, [user?.id, pathname])

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      if (mainRef.current) {
        mainRef.current.scrollTop = 0
        mainRef.current.scrollLeft = 0
      }
    })
    return () => cancelAnimationFrame(id)
  }, [pathname])

  const isAuthPage = pathname === ROUTES.LOGIN || pathname === ROUTES.REGISTER
  const isProductionRoute = pathname.startsWith(ROUTES.PRODUCTION)

  return (
    <main
      id="app-main"
      ref={mainRef}
      style={{
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
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
            <BayiOrderAlertBanner />
            <NotificationToaster />
            <MessengerBox />
            <AiChatbot />
          </>
        )}
        {children}
      </div>
    </main>
  )
}
