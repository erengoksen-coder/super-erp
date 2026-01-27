'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isAuthenticated, logout } from '@/lib/auth'

const publicPaths = ['/auth/login', '/auth/register']

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Public sayfalar için kontrol yapma
    if (publicPaths.includes(pathname || '')) {
      setIsChecking(false)
      return
    }

    // Auth kontrolü
    if (!isAuthenticated()) {
      router.push('/auth/login')
      return
    }

    setIsChecking(false)
  }, [pathname, router])

  // Public sayfalar veya authenticated kullanıcılar için içeriği göster
  if (publicPaths.includes(pathname || '')) {
    return <>{children}</>
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

