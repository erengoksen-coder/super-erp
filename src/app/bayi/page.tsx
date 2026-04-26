'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BayiPortalPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/bayi/dashboard')
  }, [router])
  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  )
}
