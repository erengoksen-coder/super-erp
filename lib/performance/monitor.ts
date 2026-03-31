import { PerformanceObserver, performance } from 'perf_hooks'
import { createHash } from 'crypto'

export interface PerformanceMetrics {
  timestamp: number
  duration: number
  memoryUsage: {
    rss: number
    heapUsed: number
    heapTotal: number
    external: number
  }
  cpuUsage: {
    user: number
    system: number
  }
  customMetrics?: Record<string, number>
}

export interface PerformanceReport {
  id: string
  operation: string
  startTime: number
  endTime: number
  duration: number
  metrics: PerformanceMetrics
  metadata?: Record<string, any>
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private activeOperations = new Map<string, { startTime: number; metadata?: Record<string, any> }>()
  private performanceData: PerformanceReport[] = []
  private observer?: PerformanceObserver

  private constructor() {
    this.setupPerformanceObserver()
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Start monitoring an operation
  startMonitoring(operationId: string, metadata?: Record<string, any>): void {
    this.activeOperations.set(operationId, {
      startTime: performance.now(),
      metadata
    })
    
    console.debug(`Started monitoring: ${operationId}`)
  }

  // Stop monitoring and collect metrics
  stopMonitoring(operationId: string): PerformanceReport | null {
    const operation = this.activeOperations.get(operationId)
    if (!operation) {
      console.warn(`No active operation found: ${operationId}`)
      return null
    }

    const endTime = performance.now()
    const duration = endTime - operation.startTime
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      duration,
      memoryUsage: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external
      },
      cpuUsage: {
        user: cpuUsage.user,
        system: cpuUsage.system
      }
    }

    const report: PerformanceReport = {
      id: this.generateReportId(),
      operation: operationId,
      startTime: operation.startTime,
      endTime,
      duration,
      metrics,
      metadata: operation.metadata
    }

    this.performanceData.push(report)
    this.activeOperations.delete(operationId)

    console.debug(`Completed monitoring: ${operationId} (${duration.toFixed(2)}ms)`)
    
    return report
  }

  // Monitor function execution
  async monitorFunction<T>(
    operationId: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startMonitoring(operationId, metadata)
    
    try {
      const result = await fn()
      this.stopMonitoring(operationId)
      return result
    } catch (error) {
      this.stopMonitoring(operationId)
      throw error
    }
  }

  // Decorator for automatic function monitoring
  static monitored(operationId?: string, metadata?: Record<string, any>) {
    return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value

      descriptor.value = async function(...args: any[]) {
        const monitor = PerformanceMonitor.getInstance()
        const opId = operationId || `${target.constructor.name}.${propertyKey}`
        
        return monitor.monitorFunction(opId, () => originalMethod.apply(this, args), metadata)
      }

      return descriptor
    }
  }

  // Get performance report
  getReport(filter?: {
    operationId?: string
    startTime?: number
    endTime?: number
    minDuration?: number
    maxDuration?: number
  }): PerformanceReport[] {
    let reports = [...this.performanceData]

    if (filter) {
      if (filter.operationId) {
        reports = reports.filter(r => r.operation === filter.operationId)
      }
      if (filter.startTime) {
        reports = reports.filter(r => r.startTime >= filter.startTime!)
      }
      if (filter.endTime) {
        reports = reports.filter(r => r.endTime <= filter.endTime!)
      }
      if (filter.minDuration) {
        reports = reports.filter(r => r.duration >= filter.minDuration!)
      }
      if (filter.maxDuration) {
        reports = reports.filter(r => r.duration <= filter.maxDuration!)
      }
    }

    return reports.sort((a, b) => b.endTime - a.endTime)
  }

  // Get performance statistics
  getStatistics(timeWindow?: number): {
    totalOperations: number
    averageDuration: number
    minDuration: number
    maxDuration: number
    p95Duration: number
    p99Duration: number
    totalDuration: number
    averageMemoryUsage: {
      rss: number
      heapUsed: number
      heapTotal: number
    }
    slowestOperations: PerformanceReport[]
    fastestOperations: PerformanceReport[]
  } {
    let reports = this.performanceData

    if (timeWindow) {
      const cutoffTime = Date.now() - timeWindow
      reports = reports.filter(r => r.endTime >= cutoffTime)
    }

    if (reports.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        totalDuration: 0,
        averageMemoryUsage: { rss: 0, heapUsed: 0, heapTotal: 0 },
        slowestOperations: [],
        fastestOperations: []
      }
    }

    const durations = reports.map(r => r.duration)
    const sortedDurations = durations.sort((a, b) => a - b)
    
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)
    const averageDuration = totalDuration / durations.length
    const minDuration = Math.min(...durations)
    const maxDuration = Math.max(...durations)
    
    const p95Index = Math.floor(durations.length * 0.95)
    const p99Index = Math.floor(durations.length * 0.99)
    const p95Duration = sortedDurations[Math.min(p95Index, sortedDurations.length - 1)]
    const p99Duration = sortedDurations[Math.min(p99Index, sortedDurations.length - 1)]

    const averageMemoryUsage = reports.reduce(
      (acc, report) => ({
        rss: acc.rss + report.metrics.memoryUsage.rss / reports.length,
        heapUsed: acc.heapUsed + report.metrics.memoryUsage.heapUsed / reports.length,
        heapTotal: acc.heapTotal + report.metrics.memoryUsage.heapTotal / reports.length
      }),
      { rss: 0, heapUsed: 0, heapTotal: 0 }
    )

    const sortedReports = reports.sort((a, b) => b.duration - a.duration)
    const slowestOperations = sortedReports.slice(0, 10)
    const fastestOperations = sortedReports.slice(-10).reverse()

    return {
      totalOperations: reports.length,
      averageDuration,
      minDuration,
      maxDuration,
      p95Duration,
      p99Duration,
      totalDuration,
      averageMemoryUsage,
      slowestOperations,
      fastestOperations
    }
  }

  // Export performance data
  exportData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.performanceData, null, 2)
    } else {
      const headers = ['id', 'operation', 'startTime', 'endTime', 'duration', 'memoryRss', 'memoryHeapUsed', 'memoryHeapTotal']
      const rows = this.performanceData.map(report => [
        report.id,
        report.operation,
        report.startTime,
        report.endTime,
        report.duration,
        report.metrics.memoryUsage.rss,
        report.metrics.memoryUsage.heapUsed,
        report.metrics.memoryUsage.heapTotal
      ])
      
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    }
  }

  // Clear performance data
  clearData(): void {
    this.performanceData = []
    console.debug('Performance data cleared')
  }

  // Setup performance observer for more detailed metrics
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach(entry => {
            console.debug('Performance Entry:', {
              name: entry.name,
              entryType: entry.entryType,
              startTime: entry.startTime,
              duration: entry.duration
            })
          })
        })

        this.observer.observe({ entryTypes: ['measure'] })
      } catch (error) {
        console.warn('Performance observer not available:', error)
      }
    }
  }

  // Generate unique report ID
  private generateReportId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get active operations
  getActiveOperations(): Array<{ operationId: string; duration: number; metadata?: Record<string, any> }> {
    const currentTime = performance.now()
    
    return Array.from(this.activeOperations.entries()).map(([operationId, operation]) => ({
      operationId,
      duration: currentTime - operation.startTime,
      metadata: operation.metadata
    }))
  }

  // Performance alerts
  checkPerformanceAlerts(thresholds?: {
    maxDuration?: number
    maxMemoryUsage?: number
    errorRate?: number
  }): Array<{
    type: 'slow_operation' | 'high_memory' | 'high_error_rate'
    message: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    data: any
  }> {
    const alerts = []
    const {
      maxDuration = 5000, // 5 seconds
      maxMemoryUsage = 500 * 1024 * 1024, // 500MB
      errorRate = 0.05 // 5%
    } = thresholds || {}

    const recentReports = this.getReport({ startTime: Date.now() - 5 * 60 * 1000 }) // Last 5 minutes

    // Check for slow operations
    const slowOps = recentReports.filter(r => r.duration > maxDuration)
    if (slowOps.length > 0) {
      alerts.push({
        type: 'slow_operation' as const,
        message: `${slowOps.length} operations exceeded duration threshold of ${maxDuration}ms`,
        severity: (slowOps.length > 3 ? 'high' : 'medium') as 'high' | 'medium' | 'low' | 'critical',
        data: { operations: slowOps, threshold: maxDuration }
      })
    }

    // Check for high memory usage
    const highMemoryOps = recentReports.filter(r => r.metrics.memoryUsage.heapUsed > maxMemoryUsage)
    if (highMemoryOps.length > 0) {
      alerts.push({
        type: 'high_memory' as const,
        message: `${highMemoryOps.length} operations exceeded memory threshold of ${maxMemoryUsage} bytes`,
        severity: (highMemoryOps.length > 2 ? 'critical' : 'high') as 'high' | 'medium' | 'low' | 'critical',
        data: { operations: highMemoryOps, threshold: maxMemoryUsage }
      })
    }

    return alerts
  }
}

// Create global instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Middleware helper for Next.js API routes
export function withPerformanceMonitoring(
  operationId?: string,
  metadata?: Record<string, any>
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function(...args: any[]) {
      const opId = operationId || `api_${propertyKey}`
      const monitor = PerformanceMonitor.getInstance()
      
      return monitor.monitorFunction(opId, () => originalMethod.apply(this, args), metadata)
    }

    return descriptor
  }
}

// Performance measurement utility
export function measure<T>(
  operationId: string,
  fn: () => Promise<T>
): Promise<{ result: T; report: PerformanceReport | null }> {
  const monitor = PerformanceMonitor.getInstance()
  
  return monitor.monitorFunction(operationId, fn).then(result => ({
    result,
    report: monitor.getReport({ operationId })[0] || null
  }))
}