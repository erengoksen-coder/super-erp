'use client'

import { useEffect } from 'react'

export default function ServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') {
      const cleanup = async () => {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((registration) => registration.unregister()))
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map((key) => caches.delete(key)))
        }
        if (navigator.serviceWorker.controller) {
          window.location.reload()
        }
      }
      cleanup()
      return
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js')
      } catch (error) {
        console.warn('Service worker kayıt edilemedi:', error)
      }
    }

    register()
  }, [])

  return null
}
