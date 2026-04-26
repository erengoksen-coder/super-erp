'use client'

import { useState, useEffect } from 'react'

interface PrefetchLinkProps {
  href: string
  children: React.ReactNode
  prefetch?: boolean
}

export function PrefetchLink({ href, children, prefetch = true }: PrefetchLinkProps) {
  useEffect(() => {
    if (prefetch && href.startsWith('/')) {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.as = 'document'
      link.href = href
      document.head.appendChild(link)
      return () => { document.head.removeChild(link) }
    }
  }, [href, prefetch])

  return <a href={href}>{children}</a>
}

export function PreloadResource({ src, type = 'script' as 'script' | 'style' | 'image' }: { src: string, type?: 'script' | 'style' | 'image' }) {
  useEffect(() => {
    if (type === 'script') {
      const s = document.createElement('link')
      s.rel = 'preload'
      s.as = 'script'
      s.href = src
      document.head.appendChild(s)
    } else if (type === 'style') {
      const s = document.createElement('link')
      s.rel = 'preload'
      s.as = 'style'
      s.href = src
      document.head.appendChild(s)
    } else if (type === 'image') {
      const img = new Image()
      img.src = src
    }
  }, [src, type])

  return null
}

export function useIdleCallback(callback: () => void) {
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(callback, { timeout: 2000 })
      return () => window.cancelIdleCallback(id)
    } else {
      const id = setTimeout(callback, 2000)
      return () => clearTimeout(id)
    }
  }, [callback])
}

export function useDebounceFast<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

export function useThrottle<T>(value: T, limit = 100) {
  const [throttledValue, setThrottledValue] = useState(value)
  const [lastRan, setLastRan] = useState(Date.now())

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan >= limit) {
        setThrottledValue(value)
        setLastRan(Date.now())
      }
    }, limit - (Date.now() - lastRan))

    return () => clearTimeout(handler)
  }, [value, limit, lastRan])

  return throttledValue
}

export function useClickAway(callback: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.modal, .dropdown, .popover, [data-keep-open]')) {
        callback()
      }
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [callback])
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  
  return isMobile
}

export function useIsMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = { current: undefined as T | undefined }
  useEffect(() => { ref.current = value }, [value])
  return ref.current
}

export function useAsyncMemo<T>(factory: () => Promise<T>, deps: any[] = []) {
  const [state, setState] = useState<T | undefined>()
  
  useEffect(() => {
    let cancelled = false
    factory().then(v => !cancelled && setState(v))
    return () => { cancelled = true }
  }, deps)
  
  return state
}