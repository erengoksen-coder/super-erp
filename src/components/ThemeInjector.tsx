'use client'

import { useEffect } from 'react'
import { fetchApi } from '@/lib/api/client'

export function ThemeInjector() {
  useEffect(() => {
    const applyTheme = async () => {
      try {
        const settings = (await fetchApi('/api/system/settings')) as any
        if (settings.theme_primary_color) {
          const doc = document.documentElement
          const color = settings.theme_primary_color
          
          // Inject CSS variables
          doc.style.setProperty('--primary-600', color)
          doc.style.setProperty('--primary-500', `${color}cc`) // Approx 80% opacity
          doc.style.setProperty('--primary-700', `${color}ee`) // Approx 93% opacity
          
          // Tailwind compatibility if needed (via hex manipulation)
          // For now we use standard CSS :root variables that our components use.
        }
        
        if (settings.company_name) {
          document.title = `${settings.company_name} - Super ERP`
        }
      } catch (error) {
        console.error('Theme injection failed:', error)
      }
    }

    applyTheme()
  }, [])

  return null
}
