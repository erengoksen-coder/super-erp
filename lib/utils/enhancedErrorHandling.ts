// Enhanced error handling middleware
import { NextRequest, NextResponse } from 'next/server'
import { createError, handleError } from './errors'
import { ErrorLogger } from './errorLogger'

export interface RequestContext {
  userId?: string
  companyId?: string
  ip?: string
  userAgent?: string
}

export function extractRequestContext(request: NextRequest): RequestContext {
  const context: RequestContext = {
    ip: request.headers.get('x-forwarded-for') || 
       request.headers.get('x-real-ip') || 
       'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  }

  // Try to extract user info from token
  const authHeader = request.headers.get('authorization')
  const cookieHeader = request.headers.get('cookie')
  
  if (cookieHeader) {
    try {
      const tokenMatch = cookieHeader.match(/auth-token=([^;]+)/)
      if (tokenMatch) {
        // In a real implementation, decode JWT here
        context.userId = 'extracted-from-token'
        context.companyId = 'extracted-from-token'
      }
    } catch {
      // Ignore token parsing errors
    }
  }

  return context
}

export function withEnhancedErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const request = args[0] as NextRequest
    const context = extractRequestContext(request)
    
    try {
      return await handler(...args)
    } catch (error) {
      // Log error with context
      ErrorLogger.log(error as Error, context)
      
      // Handle error with standard error handler
      return handleError(error) as R
    }
  }
}

export { createError }