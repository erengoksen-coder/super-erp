'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * /materials → /inventory/materials yönlendirmesi
 * Asıl hammadde sayfası /inventory/materials altında bulunuyor.
 */
export default function MaterialsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/inventory/materials')
  }, [router])
  return null
}
