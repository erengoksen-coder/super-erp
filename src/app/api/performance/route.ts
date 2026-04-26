import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { performanceMonitor } from '@/lib/performance/monitor'
import { createSuccessResponse, withRouteHandler, createError } from '@/lib/utils/errors'
import { withPerformanceMonitoring } from '@/lib/performance/monitor'

// GET: Performance dashboard data
export const GET = withRouteHandler(async (request: NextRequest) => {
  return performanceMonitor.monitorFunction('performance-dashboard', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const timeWindow = parseInt(searchParams.get('timeWindow') || '300000') // 5 minutes
      
      const statistics = performanceMonitor.getStatistics(timeWindow)
      const activeOperations = performanceMonitor.getActiveOperations()
      const alerts = performanceMonitor.checkPerformanceAlerts()
      const recentReports = performanceMonitor.getReport({ 
        startTime: Date.now() - timeWindow 
      })
      
      return createSuccessResponse({
        statistics,
        activeOperations,
        alerts,
        recentReports: recentReports.slice(0, 50), // Last 50 operations
        timestamp: new Date().toISOString()
      }, 'Performance data retrieved successfully')
    } catch (error) {
      throw error
    }
  })
})

// GET: Export performance data
export const EXPORT = withRouteHandler(async (request: NextRequest) => {
  return performanceMonitor.monitorFunction('performance-export', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const format = searchParams.get('format') || 'json'
      const timeWindow = parseInt(searchParams.get('timeWindow') || '86400000') // 24 hours
      
      const data = performanceMonitor.getReport({
        startTime: Date.now() - timeWindow
      })
      
      if (format === 'csv') {
        const csvData = performanceMonitor.exportData('csv')
        return new NextResponse(csvData, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=performance-data.csv'
          }
        })
      }
      
      const jsonData = performanceMonitor.exportData('json')
      return new NextResponse(jsonData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename=performance-data.json'
        }
      })
    } catch (error) {
      throw error
    }
  })
})

// POST: Clear performance data
export const POST = withRouteHandler(async (request: NextRequest) => {
  return performanceMonitor.monitorFunction('performance-clear', async () => {
    try {
      const body = await parseJsonBody(request)
      const { olderThan } = body
      
      if (olderThan) {
        // Clear data older than specified timestamp
        const cutoffTime = Date.now() - olderThan
        const reports = performanceMonitor.getReport({ endTime: cutoffTime })
        
        // In a real implementation, this would delete from database
        performanceMonitor.clearData()
        
        return createSuccessResponse({ 
          deletedCount: reports.length 
        }, 'Performance data cleared successfully')
      } else {
        // Clear all data
        performanceMonitor.clearData()
        
        return createSuccessResponse(null, 'All performance data cleared successfully')
      }
    } catch (error) {
      throw error
    }
  })
})

// GET: Performance alerts
export const ALERTS = withRouteHandler(async (request: NextRequest) => {
  return performanceMonitor.monitorFunction('performance-alerts', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const thresholds = {
        maxDuration: parseInt(searchParams.get('maxDuration') || '5000'),
        maxMemoryUsage: parseInt(searchParams.get('maxMemoryUsage') || (500 * 1024 * 1024).toString()),
        errorRate: parseFloat(searchParams.get('errorRate') || '0.05')
      }
      
      const alerts = performanceMonitor.checkPerformanceAlerts(thresholds)
      
      return createSuccessResponse({
        alerts,
        thresholds,
        timestamp: new Date().toISOString()
      }, 'Performance alerts retrieved successfully')
    } catch (error) {
      throw error
    }
  })
})

// GET: Performance statistics
export const STATISTICS = withRouteHandler(async (request: NextRequest) => {
  return performanceMonitor.monitorFunction('performance-statistics', async () => {
    try {
      const { searchParams } = new URL(request.url)
      const timeWindow = parseInt(searchParams.get('timeWindow') || '3600000') // 1 hour
      const operationId = searchParams.get('operationId')
      
      let statistics
      
      if (operationId) {
        // Get statistics for specific operation
        const reports = performanceMonitor.getReport({ operationId })
        statistics = {
          operationId,
          totalOperations: reports.length,
          averageDuration: reports.reduce((sum, r) => sum + r.duration, 0) / reports.length,
          minDuration: Math.min(...reports.map(r => r.duration)),
          maxDuration: Math.max(...reports.map(r => r.duration)),
          recentReports: reports.slice(-10)
        }
      } else {
        // Get overall statistics
        statistics = performanceMonitor.getStatistics(timeWindow)
      }
      
      return createSuccessResponse({
        statistics,
        timeWindow,
        timestamp: new Date().toISOString()
      }, 'Performance statistics retrieved successfully')
    } catch (error) {
      throw error
    }
  })
})
