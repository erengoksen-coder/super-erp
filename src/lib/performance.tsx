'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

interface UsePerformanceMonitorOptions {
  enableLogging?: boolean
  sampleRate?: number
}

export const usePerformanceMonitor = (options: UsePerformanceMonitorOptions = {}) => {
  const { enableLogging = false, sampleRate = 0.1 } = options
  const [metrics, setMetrics] = useState({
    fcp: 0, // First Contentful Paint
    lcp: 0, // Largest Contentful Paint
    fid: 0, // First Input Delay
    cls: 0, // Cumulative Layout Shift
  })

  useEffect(() => {
    if (Math.random() > sampleRate) return

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({ ...prev, fcp: entry.startTime }))
            }
            break
          case 'largest-contentful-paint':
            setMetrics(prev => ({ ...prev, lcp: entry.startTime }))
            break
          case 'first-input':
            setMetrics(prev => ({ ...prev, fid: (entry as any).processingStart - entry.startTime }))
            break
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              setMetrics(prev => ({ ...prev, cls: prev.cls + (entry as any).value }))
            }
            break
        }
      }
    })

    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] })

    return () => observer.disconnect()
  }, [sampleRate])

  useEffect(() => {
    if (enableLogging && metrics.fcp > 0) {
      console.log('Performance Metrics:', metrics)
    }
  }, [metrics, enableLogging])

  return metrics
}

interface UseVirtualScrollOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

export const useVirtualScroll = <T,>(
  items: T[],
  {
    itemHeight,
    containerHeight,
    overscan = 5,
  }: UseVirtualScrollOptions
) => {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = items.slice(startIndex, endIndex + 1)
  const totalHeight = items.length * itemHeight

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    containerRef,
    visibleItems,
    totalHeight,
    startIndex,
    endIndex,
    handleScroll,
  }
}

interface UseDebounceOptions {
  delay: number
}

export const useDebounce = <T,>(value: T, options: UseDebounceOptions) => {
  const { delay } = options
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

interface UseIntersectionOptions {
  threshold?: number
  rootMargin?: string
  freezeOnceVisible?: boolean
}

export const useIntersection = (options: UseIntersectionOptions = {}) => {
  const { threshold = 0, rootMargin = '0%', freezeOnceVisible = false } = options
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const frozen = useRef<boolean>(false)

  const observerRef = useRef<IntersectionObserver | null>(null)


  const ref = useCallback((node: Element | null | undefined) => {
    if (frozen.current && freezeOnceVisible) return

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    if (node) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          setEntry(entry)
          setIsVisible(entry.isIntersecting)

          if (freezeOnceVisible && entry.isIntersecting) {
            frozen.current = true
          }
        },
        { threshold, rootMargin }
      )

      observerRef.current.observe(node)
    }
  }, [threshold, rootMargin, freezeOnceVisible])

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return { ref, entry, isVisible }
}

interface UseIdleCallbackOptions {
  timeout?: number
}

export const useIdleCallback = (callback: () => void, options: UseIdleCallbackOptions = {}) => {
  const { timeout = 1000 } = options
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    const handleIdle = () => {
      callback()
    }

    const scheduleIdleCallback = () => {
      timeoutRef.current = setTimeout(handleIdle, timeout)
    }

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(handleIdle)
    } else {
      scheduleIdleCallback()
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [callback, timeout])
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ enableLogging = false }) => {
  const metrics = usePerformanceMonitor({ enableLogging })
  const [isClient, setIsClient] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return null

  const getScoreColor = (metric: number, thresholds: { good: number; poor: number }) => {
    if (metric <= thresholds.good) return 'text-emerald-400'
    if (metric <= thresholds.poor) return 'text-amber-400'
    return 'text-rose-400'
  }

  const getScoreBg = (metric: number, thresholds: { good: number; poor: number }) => {
    if (metric <= thresholds.good) return 'bg-emerald-400/20'
    if (metric <= thresholds.poor) return 'bg-amber-400/20'
    return 'bg-rose-400/20'
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-500 ${show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <div className="p-5 glass border-white/10 rounded-2xl shadow-2xl min-w-[240px] space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <h3 className="font-bold text-white text-xs uppercase tracking-widest">Sistem Performansı</h3>
          <button onClick={() => setShow(false)} className="text-gray-500 hover:text-white transition">×</button>
        </div>
        
        <div className="space-y-3">
          {[
            { label: 'FCP', val: metrics.fcp, unit: 'ms', good: 1800, poor: 3000 },
            { label: 'LCP', val: metrics.lcp, unit: 'ms', good: 2500, poor: 4000 },
            { label: 'FID', val: metrics.fid, unit: 'ms', good: 100, poor: 300 },
            { label: 'CLS', val: metrics.cls, unit: '', good: 0.1, poor: 0.25, decimal: 3 },
          ].map((m) => (
            <div key={m.label} className="flex items-center justify-between group">
              <span className="text-gray-400 text-xs font-medium">{m.label}</span>
              <div className={`px-2 py-1 rounded-md ${getScoreBg(m.val, m)} flex items-center gap-2 transition-transform group-hover:scale-105`}>
                <span className={`text-[10px] font-bold ${getScoreColor(m.val, m)}`}>
                  {m.decimal ? m.val.toFixed(m.decimal) : Math.round(m.val)}{m.unit}
                </span>
                <div className={`w-1 h-1 rounded-full ${getScoreColor(m.val, m).replace('text', 'bg')}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Lazy loading component
interface LazyLoadProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  rootMargin?: string
  threshold?: number
}

export const LazyLoad: React.FC<LazyLoadProps> = ({
  children,
  fallback = <div className="animate-pulse bg-gray-200 rounded h-32" />,
  rootMargin = '50px',
  threshold = 0.1,
}) => {
  const { ref, isVisible } = useIntersection({ rootMargin, threshold, freezeOnceVisible: true })

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  )
}

// Optimized image component
interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  loading?: 'lazy' | 'eager'
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  loading = 'lazy',
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const { ref: lazyRef } = useIntersection({
    threshold: 0.1,
    freezeOnceVisible: true,
    rootMargin: '0px',
  })

  const combinedRef = useCallback(
    (node: HTMLImageElement | null) => {
      imgRef.current = node
      if (node) lazyRef(node as any)
    },
    [lazyRef]
  )

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        ref={combinedRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={() => setIsLoaded(true)}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}