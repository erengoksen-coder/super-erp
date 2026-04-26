// Performance Analytics - Track Critical Metrics

interface PerformanceMetrics {
  lcp: number      // Largest Contentful Paint
  fcp: number      // First Contentful Paint  
  fid: number      // First Input Delay
  cls: number      // Cumulative Layout Shift
  ttfb: number     // Time to First Byte
}

const CUSTOM_THRESHOLDS = {
  lcp: 2500,      // Good: <2.5s
  fcp: 1800,      // Good: <1.8s
  fid: 100,       // Good: <100ms
  cls: 0.1,       // Good: <0.1
  ttfb: 800,      // Good: <800ms
}

export function getCLS(): number {
  if (!('performance' in window)) return 0
  const perfEntries = performance.getEntriesByType('layout-shift') as any[]
  let cls = 0
  perfEntries.forEach(entry => {
    if (!entry.hadRecentInput) {
      cls += entry.value
    }
  })
  return cls
}

export function getLCP(): Promise<number> {
  return new Promise((resolve) => {
    if (!('PerformanceObserver' in window)) {
      resolve(0)
      return
    }
    
    let lcp = 0
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any
      lcp = lastEntry.renderTime || lastEntry.loadTime
    })
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] })
    
    setTimeout(() => {
      observer.disconnect()
      resolve(lcp)
    }, 3000)
  })
}

export function getFCP(): Promise<number> {
  return new Promise((resolve) => {
    if (!('PerformanceObserver' in window)) {
      resolve(0)
      return
    }
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const fcp = entries[0] as any
      resolve(fcp.startTime)
      observer.disconnect()
    })
    
    observer.observe({ entryTypes: ['first-contentful-paint'] })
    
    setTimeout(() => {
      observer.disconnect()
      resolve(0)
    }, 3000)
  })
}

export function getTTFB(): number {
  const perfEntry = performance.getEntriesByType('navigation')[0] as any
  return perfEntry?.responseStart || 0
}

export function isPerformanceGood(metrics: Partial<PerformanceMetrics>): boolean {
  return (
    (metrics.lcp || 0) <= CUSTOM_THRESHOLDS.lcp &&
    (metrics.fcp || 0) <= CUSTOM_THRESHOLDS.fcp &&
    (metrics.fid || 0) <= CUSTOM_THRESHOLDS.fid &&
    (metrics.cls || 0) <= CUSTOM_THRESHOLDS.cls
  )
}

export function logPerformanceMetrics() {
  getLCP().then(lcp => {
    getFCP().then(fcp => {
      const cls = getCLS()
      const ttfb = getTTFB()
      
      console.group('📊 Performance Metrics')
      console.log(`LCP: ${lcp.toFixed(2)}ms ${lcp <= CUSTOM_THRESHOLDS.lcp ? '✅' : '❌'}`)
      console.log(`FCP: ${fcp.toFixed(2)}ms ${fcp <= CUSTOM_THRESHOLDS.fcp ? '✅' : '❌'}`)
      console.log(`CLS: ${cls.toFixed(3)} ${cls <= CUSTOM_THRESHOLDS.cls ? '✅' : '❌'}`)
      console.log(`TTFB: ${ttfb.toFixed(2)}ms ${ttfb <= CUSTOM_THRESHOLDS.ttfb ? '✅' : '❌'}`)
      console.log(`Overall: ${isPerformanceGood({ lcp, fcp, cls }) ? '✅ PASSED' : '❌ NEEDS OPTIMIZATION'}`)
      console.groupEnd()
      
      // Send to analytics if critical
      if (lcp > CUSTOM_THRESHOLDS.lcp * 1.5) {
        console.warn('⚠️ LCP is critical - consider optimizations')
      }
    })
  })
}

// Track page navigation performance
export function trackPageNavigation(from: string, to: string) {
  const navPerf = performance.getEntriesByType('navigation')[0] as any
  console.log(`📤 Navigation: ${from} → ${to}`, {
    duration: navPerf?.duration || 0,
    ttfb: navPerf?.responseStart || 0,
  })
}

export function isSlowConnection() {
  const cn = (navigator as any).connection
  if (!cn) return false
  return cn.saveData || cn.effectiveType === 'slow-2g' || cn.effectiveType === '2g'
}

export function isRetina() {
  return window.devicePixelRatio > 1
}