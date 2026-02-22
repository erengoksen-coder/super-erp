'use client'

import { useState, useEffect } from 'react'
import { WifiOff, Loader2 } from 'lucide-react'
import useSWRConfig from 'swr'
import { toast } from '@/lib/notify'

const HEALTH_CHECK_TIMEOUT_MS = 8_000

/** İnternet veya sunucu erişilemediğinde üstte gösterilen uyarı şeridi. Yeniden bağlanınca sunucu kontrol edilir. */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [serverUnreachable, setServerUnreachable] = useState(false)
  const { mutate: globalMutate } = useSWRConfig()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOffline = () => {
      setIsOffline(true)
      setServerUnreachable(false)
    }
    const handleOnline = () => {
      setIsOffline(false)
      setServerUnreachable(false)
      setIsChecking(true)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS)
      fetch('/api/health?deep=true', { credentials: 'include', signal: controller.signal })
        .then((res) => {
          if (res.ok) {
            setServerUnreachable(false)
            setIsChecking(false)
            toast.success('Bağlantı yeniden kuruldu')
            globalMutate(() => true)
          } else {
            setServerUnreachable(true)
            setIsChecking(false)
          }
        })
        .catch(() => {
          setServerUnreachable(true)
          setIsChecking(false)
        })
        .finally(() => {
          clearTimeout(timeoutId)
        })
    }
    const initiallyOffline = !window.navigator.onLine
    setIsOffline(initiallyOffline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [globalMutate])

  const show = isOffline || serverUnreachable || isChecking
  if (!show) return null

  const message = isChecking
    ? 'Bağlantı kontrol ediliyor...'
    : serverUnreachable
      ? 'Sunucuya ulaşılamıyor. Lütfen daha sonra tekrar deneyin veya sayfayı yenileyin.'
      : 'Çevrimdışısınız. Bağlantı yeniden kurulana kadar değişiklikleriniz sunucuya gönderilemeyebilir.'

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2 px-4 bg-amber-600 text-white text-sm font-medium shadow-lg"
      role="alert"
      aria-live="polite"
    >
      {isChecking ? (
        <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
      ) : (
        <WifiOff className="w-4 h-4 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  )
}
