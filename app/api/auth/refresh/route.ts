import { NextRequest } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { signAccessToken, accessTokenTtlSeconds } from '@/lib/auth/jwt'
import {
  generateRefreshToken,
  getRefreshTokenFromRequest,
  hashToken,
  refreshTokenTtlDays,
  setAuthCookies,
} from '@/lib/auth/session'

type SessionRow = {
  id: string
  user_id: string
  expires_at: string
  revoked_at: string | null
}

type UserRow = {
  id: string
  username: string
  email: string | null
  full_name: string | null
  role: string
  job_title: string | null
  is_approved: number
}

export async function POST(request: NextRequest) {
  try {
    const refreshToken = getRefreshTokenFromRequest(request)
    if (!refreshToken) {
      return fail('Oturum bulunamadı', { status: 401 })
    }

    const db = getDatabase()
    const session = db.prepare(`
      SELECT id, user_id, expires_at, revoked_at
      FROM user_sessions
      WHERE refresh_token_hash = ?
        AND deleted_at IS NULL
    `).get(hashToken(refreshToken)) as SessionRow | undefined

    if (!session || session.revoked_at) {
      return fail('Oturum geçersiz', { status: 401 })
    }

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      return fail('Oturum süresi dolmuş', { status: 401 })
    }

    const user = db.prepare(`
      SELECT id, username, email, full_name, role, job_title, is_approved
      FROM users
      WHERE id = ? AND deleted_at IS NULL
    `).get(session.user_id) as UserRow | undefined

    if (!user || !user.is_approved) {
      return fail('Kullanıcı bulunamadı veya onaylanmamış', { status: 401 })
    }

    const accessToken = await signAccessToken({
      userId: user.id,
      role: user.role,
      username: user.username,
    })
    const newRefreshToken = generateRefreshToken()
    const refreshTtlSeconds = refreshTokenTtlDays * 24 * 60 * 60
    const expiresAt = new Date(Date.now() + refreshTtlSeconds * 1000).toISOString()

    db.prepare(`
      UPDATE user_sessions
      SET refresh_token_hash = ?,
          expires_at = ?,
          last_used_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(hashToken(newRefreshToken), expiresAt, session.id)

    const response = ok({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        job_title: user.job_title,
      },
    })
    setAuthCookies(response, accessToken, newRefreshToken, accessTokenTtlSeconds, refreshTtlSeconds)
    return response
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}
