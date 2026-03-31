import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { canAccessPath, isAdminRole, type PermissionAction } from '@/lib/auth/permissions-check'
import { loadUserPermissions } from '@/lib/auth/permissions'
import { getDatabase } from '@/lib/database/db'

export type AuthUser = {
  userId: string
  role: string
  companyId: string
  branchId: string
}

function normalizeRole(role: string | undefined | null) {
  const raw = (role || '').toString().trim().toLowerCase()
  if (raw === 'yönetici' || raw === 'yonetici') return 'admin'
  return raw
}

export type AuthContext<T = unknown> = T

export const withAuth = <TContext = unknown>(
  handler: (req: NextRequest, user: AuthUser, context: TContext) => Promise<Response>,
  allowedRoles?: string[]
) => {
  return async (req: NextRequest, context: TContext) => {
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

      return await handler(req, { 
        userId: payload.userId, 
        role: payload.role,
        companyId: payload.companyId,
        branchId: payload.branchId
      }, context)
    } catch (error: any) {
      console.error('[withAuth] Critical Error:', error.message)
      return NextResponse.json({ error: 'Sunucu yetkilendirme hatası' }, { status: 500 })
    }
  }
}

/**
 * withAuth + sayfa izni kontrolü. Admin/yönetici her zaman geçer; diğer kullanıcılar için
 * user_permissions/role_permissions ile path+action kontrolü yapılır.
 */
export function withAuthAndPermission<TContext = unknown>(
  handler: (req: NextRequest, user: AuthUser, context: AuthContext<TContext>) => Promise<Response>,
  path: string,
  action: PermissionAction = 'view'
) {
  return withAuth<TContext>(async (req, user, context) => {
    if (isAdminRole(user.role)) return handler(req, user, context)
    const db = getDatabase()
    const permissions = loadUserPermissions(db, user.userId)
    if (!canAccessPath(permissions, path, action)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403, headers: { 'Content-Type': 'application/json' } })
    }
    return handler(req, user, context)
  })
}
