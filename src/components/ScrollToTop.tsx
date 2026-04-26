"use client"

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    // Scroll'u bir sonraki frame'e erteleyerek forced reflow uyarısını azaltır
    const id = requestAnimationFrame(() => {
      const mainElement = document.getElementById('app-main')
      if (mainElement) {
        mainElement.scrollTop = 0
        mainElement.scrollLeft = 0
      }
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    })
    return () => cancelAnimationFrame(id)
  }, [pathname])

  return null
}

