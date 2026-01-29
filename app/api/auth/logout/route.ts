import { NextRequest } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { ok } from '@/lib/api/response'
import { clearAuthCookies, getRefreshTokenFromRequest, hashToken } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  const db = getDatabase()
  const refreshToken = getRefreshTokenFromRequest(request)

  if (refreshToken) {
    db.prepare(`
      UPDATE user_sessions
      SET revoked_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE refresh_token_hash = ? AND revoked_at IS NULL
    `).run(hashToken(refreshToken))
  }

  const response = ok({ success: true })
  clearAuthCookies(response)
  return response
}
