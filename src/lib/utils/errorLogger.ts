// Error logging service
import { ERROR_CODES } from './errors'

export interface ErrorLog {
  id?: string
  userId?: string
  companyId?: string
  errorCode: string
  message: string
  stack?: string
  context?: Record<string, any>
  userAgent?: string
  ip?: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

class ErrorLoggerService {
  private static logs: ErrorLog[] = []
  
  static log(error: Error, context?: Record<string, any>): void {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      userId: context?.userId,
      companyId: context?.companyId,
      errorCode: (error as any).code || 'INTERNAL_ERROR',
      message: error.message,
      stack: error.stack,
      context,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      ip: context?.ip,
      timestamp: new Date().toISOString(),
      severity: this.getSeverity(error)
    }
    
    this.logs.push(errorLog)
    this.persistLog(errorLog)
    this.notify(errorLog)
  }

  static async persistLog(errorLog: ErrorLog): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorLogger]', errorLog)
      return
    }
    
    try {
      console.log('Error persisted:', errorLog.id)
    } catch (persistError) {
      console.error('Failed to persist error log:', persistError)
    }
  }

  static notify(errorLog: ErrorLog): void {
    if (errorLog.severity === 'critical') {
      console.error('🚨 Critical Error:', errorLog)
    }
  }

  private static generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private static getSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const errorCode = (error as any).code
    
    if (errorCode === ERROR_CODES.DATABASE_ERROR || errorCode === ERROR_CODES.INTERNAL_ERROR) {
      return 'critical'
    }
    
    if (errorCode === ERROR_CODES.UNAUTHORIZED || errorCode === ERROR_CODES.FORBIDDEN) {
      return 'high'
    }
    
    if (errorCode === ERROR_CODES.NOT_FOUND || errorCode === ERROR_CODES.VALIDATION_ERROR) {
      return 'medium'
    }
    
    return 'low'
  }

  static getLogs(filters?: {
    userId?: string
    companyId?: string
    severity?: string
    limit?: number
  }): ErrorLog[] {
    let filteredLogs = this.logs

    if (filters?.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId)
    }

    if (filters?.companyId) {
      filteredLogs = filteredLogs.filter(log => log.companyId === filters.companyId)
    }

    if (filters?.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === filters.severity)
    }

    if (filters?.limit) {
      filteredLogs = filteredLogs.slice(-filters.limit)
    }

    return filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  static clearLogs(): void {
    this.logs = []
  }

  static getErrorStats(): {
    total: number
    bySeverity: Record<string, number>
    byCode: Record<string, number>
    recent: ErrorLog[]
  } {
    const stats = {
      total: this.logs.length,
      bySeverity: {} as Record<string, number>,
      byCode: {} as Record<string, number>,
      recent: this.logs.slice(-10)
    }

    this.logs.forEach(log => {
      stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1
      stats.byCode[log.errorCode] = (stats.byCode[log.errorCode] || 0) + 1
    })

    return stats
  }
}

export function setupGlobalErrorHandlers(): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      ErrorLoggerService.log(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaught_error'
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      ErrorLoggerService.log(new Error(event.reason), {
        type: 'unhandled_promise_rejection'
      })
    })
  } else {
    process.on('uncaughtException', (error) => {
      ErrorLoggerService.log(error, { type: 'uncaught_exception' })
      process.exit(1)
    })

    process.on('unhandledRejection', (reason) => {
      ErrorLoggerService.log(new Error(String(reason)), { type: 'unhandled_rejection' })
    })
  }
}

export const ErrorLogger = ErrorLoggerService