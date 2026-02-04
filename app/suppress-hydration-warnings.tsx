"use client"

import { useEffect } from 'react'

export default function SuppressHydrationWarnings() {
  useEffect(() => {
    // Development modunda hydration uyarılarını filtrele
    if (process.env.NODE_ENV === 'development') {
      const originalError = console.error
      console.error = (...args: any[]) => {
        // wfd-invisible gibi tarayıcı eklentisi kaynaklı hydration hatalarını filtrele
        const firstArg = args[0]
        if (
          typeof firstArg === 'string' &&
          (firstArg.includes('Hydration') || 
           firstArg.includes('wfd-invisible') ||
           firstArg.includes('server rendered HTML'))
        ) {
          return // Bu hataları gösterme
        }
        originalError.call(console, ...args)
      }
    }
  }, [])

  return null
}
