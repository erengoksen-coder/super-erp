import { createHash, randomBytes } from 'crypto'
import type { NextRequest, NextResponse } from 'next/server'

export const CSRF_COOKIE = 'csrf-token'
export const CSRF_HEADER = 'x-csrf-token'

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashCsrfToken(token: string): string {
  const secret = process.env.JWT_SECRET || 'fallback'
  return createHash('sha256').update(token + secret).digest('hex')
}

export function setCsrfCookie(response: NextResponse, token: string) {
  const isSecure = process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true'
  
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 2,
  })
}

export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value
  const headerToken = request.headers.get(CSRF_HEADER)
  
  if (!cookieToken || !headerToken) {
    return false
  }
  
  if (cookieToken !== headerToken) {
    return false
  }
  
  return true
}

export function getCsrfTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE)?.value || null
}
