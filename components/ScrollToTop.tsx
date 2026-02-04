"use client"

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    // Disable browser's scroll restoration once
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    // Simple scroll to top on route change
    const mainElement = document.getElementById('app-main')
    if (mainElement) {
      mainElement.scrollTop = 0
      mainElement.scrollLeft = 0
    }
    
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname])

  return null
}

