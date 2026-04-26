import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { apiLimiter } from '@/lib/rate-limit'

// Role-to-Dashboard Mapping (Platinum Redirection Engine)
const ROLE_DASHBOARDS: Record<string, string> = {
  'admin': '/dashboard',
  'bayi': '/bayi/dashboard',
  'operator': '/mobile/workstation',
  'muhasebe': '/accounting',
  'depo': '/inventory',
  'sevkiyat': '/shipments',
  'planlama': '/production',
  'management': '/reports',
  'ik': '/hr',
  'satis': '/orders',
  'satinalma': '/purchase-requests'
}

// Role-to-Restricted-Paths Mapping (Ironclad Guard)
const RESTRICTED_PATHS: Record<string, string[]> = {
  'bayi': ['/accounting', '/finance', '/inventory', '/production', '/hr', '/admin', '/settings', '/reports'],
  'operator': ['/accounting', '/finance', '/inventory', '/hr', '/admin', '/settings', '/reports', '/crm', '/shipments'],
  'depo': ['/accounting', '/finance', '/hr', '/admin', '/crm'],
  'muhasebe': ['/production', '/inventory', '/shipments', '/mobile'],
  'sevkiyat': ['/accounting', '/finance', '/production', '/hr', '/admin', '/settings']
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. API Rate Limiting
  if (pathname.startsWith('/api/')) {
    const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1'
    try {
      // Allow 500 requests per minute from a single IP globally
      await apiLimiter.check(500, ip)
    } catch {
      return new NextResponse(JSON.stringify({ error: 'Çok fazla istek. Lütfen bekleyin.' }), { status: 429, headers: { 'Content-Type': 'application/json' } })
    }
  }

  // 2. Auth & RBAC Check
  const isAuthPage = pathname.startsWith('/auth')
  const isApiAuth = pathname.startsWith('/api/auth')
  const isPublicAsset = pathname.includes('.') || pathname.includes('favicon')

  if (!isAuthPage && !isApiAuth && !isPublicAsset) {
    const token = request.cookies.get('auth-token')?.value
    let payload: any = null
    
    if (token) {
      try {
        payload = await verifyToken(token)
      } catch {
        payload = null
      }
    }

    if (!payload) {
      const loginUrl = new URL('/auth/login', request.url)
      if (pathname !== '/') loginUrl.searchParams.set('returnUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // RBAC: Role-Based Redirection for root
    const role = (payload.role || 'user').toLowerCase()
    if (pathname === '/' || pathname === '/dashboard') {
      const targetDashboard = ROLE_DASHBOARDS[role]
      if (targetDashboard && targetDashboard !== pathname) {
        return NextResponse.redirect(new URL(targetDashboard, request.url))
      }
    }

    // RBAC: Ironclad Path Guard
    const forbiddenPaths = RESTRICTED_PATHS[role] || []
    if (forbiddenPaths.some(path => pathname.startsWith(path))) {
      const fallback = ROLE_DASHBOARDS[role] || '/'
      const url = new URL(fallback, request.url)
      url.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(url)
    }
  }

  const response = NextResponse.next()

  // 3. Security & CORS Headers
  const origin = request.headers.get('origin')
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health|manifest.json|sw.js).*)'],
}
