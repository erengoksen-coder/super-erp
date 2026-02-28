import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/api/rateLimit'
import { verifyToken } from '@/lib/auth/jwt'

const DEFAULT_LIMIT = { keyPrefix: 'api', max: 1500, windowMs: 60_000 }
const AUTH_LIMIT = { keyPrefix: 'auth', max: 20, windowMs: 60_000 }
const ADMIN_LIMIT = { keyPrefix: 'admin', max: 100, windowMs: 60_000 }
/** auth/me ve auth/refresh sık çağrıldığı için ayrı kotada, daha yüksek limit */
const AUTH_ME_LIMIT = { keyPrefix: 'auth-me', max: 500, windowMs: 60_000 }

const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/ping',
  '/api/auth/db-check',
  '/api/health',
  '/api/ready',
  '/api/icon',
  '/api/manifest',
  '/api/notifications/vapid-public-key',
]

/** Giriş yapmadan erişilebilen sayfalar (ngrok dahil tüm adrese gelenler diğerlerinde login'e gider) */
const PUBLIC_PAGE_PATHS = ['/auth/login', '/auth/register', '/durum', '/bakim']

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

/** Bakım modu: MAINTENANCE_MODE=true iken tüm sayfa istekleri /bakim'e, API istekleri 503 döner (health/ready hariç). */
const MAINTENANCE_API_ALLOWED = ['/api/health', '/api/ready']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (process.env.MAINTENANCE_MODE === 'true') {
    if (pathname === '/bakim') return NextResponse.next()
    if (pathname.startsWith('/api')) {
      if (MAINTENANCE_API_ALLOWED.some((p) => pathname.startsWith(p))) return NextResponse.next()
      return NextResponse.json(
        { error: 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.' },
        { status: 503 }
      )
    }
    return NextResponse.redirect(new URL('/bakim', request.url))
  }

  // API istekleri: rate limit + auth (mevcut mantık)
  if (pathname.startsWith('/api')) {
    if (pathname === '/api/orders/import') {
      return NextResponse.next()
    }
    // Veritabanı kontrolü — giriş yapmadan erişilebilir (login 500 ayıklama)
    if (pathname === '/api/auth/db-check') {
      return NextResponse.next()
    }
    const options = getRateLimitOptions(pathname)
    const result = rateLimit(request, options)
    if (!result.allowed) {
      const retryAfterSec = Math.ceil((result.reset - Date.now()) / 1000)
      const message =
        retryAfterSec > 0
          ? `Çok fazla istek gönderdiniz. ${retryAfterSec} saniye sonra tekrar deneyin.`
          : 'Çok fazla istek gönderdiniz. Lütfen kısa süre sonra tekrar deneyin.'
      return NextResponse.json(
        { error: message },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, retryAfterSec)),
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
  matcher: ['/', '/bakim', '/bayi', '/bayi/:path*', '/api/:path*'],
}
