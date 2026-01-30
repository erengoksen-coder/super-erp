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

export const withAuth = (
  handler: (req: NextRequest, user: AuthUser, context?: unknown) => Promise<Response>,
  allowedRoles?: string[]
) => {
  return async (req: NextRequest, context?: unknown) => {
    try {
      const authHeader = req.headers.get('authorization')
      const headerToken = authHeader?.startsWith('Bearer ')
        ? authHeader.replace('Bearer ', '').trim()
        : authHeader?.trim()
      const cookieToken = req.cookies.get('auth-token')?.value || req.cookies.get('access_token')?.value
      const token = headerToken || cookieToken

      if (!token) {
        return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 })
      }

      const payload = await verifyToken(token)
      if (!payload) {
        return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })
      }

      if (allowedRoles && allowedRoles.length > 0) {
        const normalizedRoles = allowedRoles.map((role) => normalizeRole(role))
        const normalizedRole = normalizeRole(payload.role)
        if (!normalizedRoles.includes(normalizedRole)) {
          return NextResponse.json({ error: 'Yetki yetersiz' }, { status: 403 })
        }
      }

      return await handler(req, { userId: payload.userId, role: payload.role }, context)
    } catch (error) {
      return NextResponse.json({ error: 'Auth hatası' }, { status: 500 })
    }
  }
}
