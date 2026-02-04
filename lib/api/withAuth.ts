import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'

type AuthUser = {
  userId: string
  role: string
}

function normalizeRole(role: string | undefined | null) {
  const raw = (role || '').toString().trim().toLowerCase()
  if (raw === 'yönetici' || raw === 'yonetici') return 'admin'
  return raw
}

export const withAuth = <TContext = unknown>(
  handler: (req: NextRequest, user: AuthUser, context?: TContext) => Promise<Response>,
  allowedRoles?: string[]
) => {
  return async (req: NextRequest, context?: TContext) => {
    try {
      const authHeader = req.headers.get('authorization')
      const headerToken = authHeader?.startsWith('Bearer ')
        ? authHeader.replace('Bearer ', '').trim()
        : authHeader?.trim()
      const cookieToken = req.cookies.get('auth-token')?.value || req.cookies.get('access_token')?.value
      const token = headerToken || cookieToken

      if (!token) {
        return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401, headers: { 'Content-Type': 'application/json' } })
      }

      const payload = await verifyToken(token)
      if (!payload) {
        return NextResponse.json({ error: 'Geçersiz token' }, { status: 401, headers: { 'Content-Type': 'application/json' } })
      }

      if (allowedRoles && allowedRoles.length > 0) {
        const normalizedRoles = allowedRoles.map((role) => normalizeRole(role))
        const normalizedRole = normalizeRole(payload.role)
        if (!normalizedRoles.includes(normalizedRole)) {
          return NextResponse.json({ error: 'Yetki yetersiz' }, { status: 403, headers: { 'Content-Type': 'application/json' } })
        }
      }

      let response: Response
      try {
        response = await handler(req, { userId: payload.userId, role: payload.role }, context)
        
        // Response'un geçerli olup olmadığını kontrol et
        // NextResponse, Response'un bir alt sınıfıdır, bu yüzden instanceof Response kontrolü yeterli
        if (!response) {
          console.error('[withAuth] Handler returned null/undefined response')
          return NextResponse.json({ 
            error: 'Handler response döndürmedi',
            details: process.env.NODE_ENV === 'development' ? 'Handler returned null or undefined' : undefined
          }, { status: 500, headers: { 'Content-Type': 'application/json' } })
        }
        
        // Response'un bir Response objesi olduğundan emin ol
        // NextResponse, Response'un bir alt sınıfıdır, bu yüzden instanceof Response kontrolü yeterli
        if (!(response instanceof Response)) {
          console.error('[withAuth] Handler returned invalid response type:', typeof response, response)
          console.error('[withAuth] Response constructor:', response?.constructor?.name)
          console.error('[withAuth] Response value:', JSON.stringify(response, null, 2))
          return NextResponse.json({ 
            error: 'Handler geçersiz response tipi döndürdü',
            details: process.env.NODE_ENV === 'development' ? `Response type: ${typeof response}, constructor: ${response?.constructor?.name}` : undefined
          }, { status: 500, headers: { 'Content-Type': 'application/json' } })
        }
      } catch (handlerError: any) {
        console.error('[withAuth] Handler error:', handlerError)
        console.error('[withAuth] Handler error stack:', handlerError?.stack)
        const handlerErrorMessage = handlerError?.message || handlerError?.toString() || 'Handler hatası'
        return NextResponse.json({ 
          error: handlerErrorMessage,
          details: process.env.NODE_ENV === 'development' ? handlerError?.stack : undefined
        }, { status: 500, headers: { 'Content-Type': 'application/json' } })
      }
      
      // Eğer response bir NextResponse ise ve header yoksa ekle
      if (response instanceof NextResponse) {
        const contentType = response.headers.get('Content-Type')
        if (!contentType || !contentType.includes('application/json')) {
          response.headers.set('Content-Type', 'application/json')
        }
      } else if (response instanceof Response) {
        // Response bir Response objesi ise, header ekle
        try {
          const contentType = response.headers.get('Content-Type')
          if (!contentType || !contentType.includes('application/json')) {
            const headers = new Headers(response.headers)
            headers.set('Content-Type', 'application/json')
            // Response body'yi oku ve yeni response oluştur
            const body = await response.text()
            return new Response(body, {
              status: response.status,
              statusText: response.statusText,
              headers: headers
            })
          }
        } catch (headerError: any) {
          // Header ekleme başarısız olursa, yeni bir response oluştur
          console.error('[withAuth] Response header error:', headerError)
          try {
            const body = await response.text()
            return new Response(body, {
              status: response.status,
              statusText: response.statusText,
              headers: { 'Content-Type': 'application/json' }
            })
          } catch (textError: any) {
            console.error('[withAuth] Response text read error:', textError)
            return NextResponse.json({ 
              error: 'Response işlenirken hata oluştu',
              details: process.env.NODE_ENV === 'development' ? textError?.message : undefined
            }, { status: 500, headers: { 'Content-Type': 'application/json' } })
          }
        }
      }
      
      return response
    } catch (error: any) {
      console.error('[withAuth] Error:', error)
      const errorMessage = error?.message || 'Auth hatası'
      return NextResponse.json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      }, { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
  }
}
