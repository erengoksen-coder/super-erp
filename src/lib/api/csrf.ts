import { NextRequest, NextResponse } from 'next/server'
import { validateCsrfToken } from '@/lib/auth/csrf'

export type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS'

export interface CsrfProtectedRouteOptions {
  methods?: HttpMethod[]
}

export function withCsrfProtection(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]) => {
    const method = req.method as HttpMethod
    
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return handler(req, ...args)
    }
    
    if (!validateCsrfToken(req)) {
      return NextResponse.json(
        { error: 'CSRF token geçersiz veya eksik' },
        { status: 403 }
      )
    }
    
    return handler(req, ...args)
  }
}

export function validateCsrfForRequest(req: NextRequest): { valid: boolean; error?: NextResponse } {
  const method = req.method as HttpMethod
  
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true }
  }
  
  if (!validateCsrfToken(req)) {
    return { 
      valid: false, 
      error: NextResponse.json(
        { error: 'CSRF token geçersiz veya eksik' },
        { status: 403 }
      )
    }
  }
  
  return { valid: true }
}
