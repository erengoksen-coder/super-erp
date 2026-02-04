import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/api/rateLimit'
import { verifyToken } from '@/lib/auth/jwt'

const DEFAULT_LIMIT = { keyPrefix: 'api', max: 120, windowMs: 60_000 }
const AUTH_LIMIT = { keyPrefix: 'auth', max: 10, windowMs: 60_000 }

const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/health',
  '/api/notifications/vapid-public-key',
]

function isPublicApiPath(pathname: string) {
  return PUBLIC_API_PATHS.some((path) => pathname.startsWith(path))
}

function getRateLimitOptions(pathname: string) {
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
    return AUTH_LIMIT
  }
  return DEFAULT_LIMIT
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const options = getRateLimitOptions(pathname)
  const result = rateLimit(request, options)

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Rate limit aşıldı. Lütfen daha sonra tekrar deneyin.' },
      {
        status: 429,
        headers: {
          'x-ratelimit-limit': String(options.max),
          'x-ratelimit-remaining': String(result.remaining),
          'x-ratelimit-reset': String(result.reset),
        },
      }
    )
  }

  if (!isPublicApiPath(pathname)) {
    const authHeader = request.headers.get('authorization')
    const headerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.replace('Bearer ', '').trim()
      : authHeader?.trim()
    const cookieToken =
      request.cookies.get('auth-token')?.value ||
      request.cookies.get('access_token')?.value
    const token = headerToken || cookieToken

    if (!token) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
    }
  }

  const response = NextResponse.next()
  response.headers.set('x-ratelimit-limit', String(options.max))
  response.headers.set('x-ratelimit-remaining', String(result.remaining))
  response.headers.set('x-ratelimit-reset', String(result.reset))
  return response
}

export const config = {
  matcher: ['/api/:path*'],
}
