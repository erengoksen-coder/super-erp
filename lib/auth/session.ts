import { createHash, randomBytes } from 'crypto'
import type { NextRequest, NextResponse } from 'next/server'
import type Database from 'better-sqlite3'
import { verifyAccessToken } from '@/lib/auth/jwt'

const ACCESS_COOKIE = 'access_token'
const AUTH_COOKIE = 'auth-token'
const REFRESH_COOKIE = 'refresh_token'

export const refreshTokenTtlDays = 7

export function generateRefreshToken() {
  return randomBytes(48).toString('hex')
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function getAccessTokenFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  
  // Prioritize HttpOnly cookie over localStorage token for security
  return request.cookies.get(AUTH_COOKIE)?.value || bearer || null
}

export function getRefreshTokenFromRequest(request: NextRequest) {
  return request.cookies.get(REFRESH_COOKIE)?.value || null
}

export async function getAuthUserId(request: NextRequest) {
  const token = getAccessTokenFromRequest(request)
  if (!token) return null
  try {
    const payload = await verifyAccessToken(token)
    return payload.userId || payload.sub || null
  } catch {
    return null
  }
}

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  accessMaxAgeSeconds: number,
  refreshMaxAgeSeconds: number
) {
  const isSecure = process.env.NODE_ENV === 'production' || process.env.HTTPS === 'true'
  
  // Set primary HttpOnly cookie with access token
  response.cookies.set(AUTH_COOKIE, accessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: accessMaxAgeSeconds,
  })
  
  // Set refresh token in HttpOnly cookie
  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: refreshMaxAgeSeconds,
  })
}

export function clearAuthCookies(response: NextResponse) {
  const isSecure = process.env.NODE_ENV === 'production' || process.env.HTTPS === 'true'
  
  response.cookies.set(AUTH_COOKIE, '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  
  // Clear any remaining access token cookie
  response.cookies.set(ACCESS_COOKIE, '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  
  response.cookies.set(REFRESH_COOKIE, '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

export function createUserSession(
  db: Database.Database,
  input: {
    id: string
    userId: string
    refreshTokenHash: string
    expiresAt: string
    userAgent?: string | null
    ipAddress?: string | null
  }
) {
  db.prepare(`
    INSERT INTO user_sessions
    (id, user_id, refresh_token_hash, expires_at, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    input.id,
    input.userId,
    input.refreshTokenHash,
    input.expiresAt,
    input.userAgent || null,
    input.ipAddress || null
  )
}
