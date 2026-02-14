import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/api/rateLimit'
import { verifyToken } from '@/lib/auth/jwt'

const DEFAULT_LIMIT = { keyPrefix: 'api', max: 300, windowMs: 60_000 }
const AUTH_LIMIT = { keyPrefix: 'auth', max: 10, windowMs: 60_000 }
const ADMIN_LIMIT = { keyPrefix: 'admin', max: 30, windowMs: 60_000 }
/** auth/me ve auth/refresh sık çağrıldığı için ayrı kotada, daha yüksek limit */
const AUTH_ME_LIMIT = { keyPrefix: 'auth-me', max: 60, windowMs: 60_000 }

const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/ping',
  '/api/health',
  '/api/icon',
  '/api/manifest',
  '/api/notifications/vapid-public-key',
]

/** Giriş yapmadan erişilebilen sayfalar (ngrok dahil tüm adrese gelenler diğerlerinde login'e gider) */
const PUBLIC_PAGE_PATHS = ['/auth/login', '/auth/register', '/durum', '/hr/clock']

function isPublicApiPath(pathname: string) {
  return PUBLIC_API_PATHS.some((path) => pathname.startsWith(path))
}

function isPublicPagePath(pathname: string) {
  return PUBLIC_PAGE_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function getRateLimitOptions(pathname: string) {
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
    return AUTH_LIMIT
  }
  if (pathname === '/api/auth/me' || pathname === '/api/auth/refresh') {
    return AUTH_ME_LIMIT
  }
  if (pathname.startsWith('/api/admin')) {
    return ADMIN_LIMIT
  }
  return DEFAULT_LIMIT
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // API istekleri: rate limit + auth (mevcut mantık)
  if (pathname.startsWith('/api')) {
    if (pathname === '/api/orders/import') {
      return NextResponse.next()
    }
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

  // Sayfa istekleri: ngrok dahil adrese tıklayan herkes token yoksa girişe yönlendirilir
  if (isPublicPagePath(pathname)) {
    return NextResponse.next()
  }
  const cookieToken =
    request.cookies.get('auth-token')?.value ||
    request.cookies.get('access_token')?.value
  if (!cookieToken) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url, 302)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/bayi', '/bayi/:path*', '/api/:path*'],
}
