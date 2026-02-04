import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { rateLimit } from '@/lib/api/rateLimit'
import { hashPassword, isLegacySha256Hash, verifyPassword } from '@/lib/auth/password'
import { ok, fail } from '@/lib/api/response'
import { createToken, accessTokenTtlSeconds } from '@/lib/auth/jwt'
import {
  createUserSession,
  generateRefreshToken,
  hashToken,
  refreshTokenTtlDays,
  setAuthCookies,
} from '@/lib/auth/session'
import { loadUserPermissions } from '@/lib/auth/permissions'

type UserRow = {
  id: string
  username: string
  email: string | null
  full_name: string | null
  role: string
  is_approved: number
  job_title: string | null
  password_hash: string
}

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Kullanıcı adı gerekli'),
  password: z.string().min(1, 'Şifre gerekli'),
})

// POST: Kullanıcı girişi
export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(request, {
      keyPrefix: 'auth:login',
      max: 10,
      windowMs: 60_000,
    })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla deneme. Lütfen sonra tekrar deneyin.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((limit.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    let body: z.infer<typeof loginSchema>
    try {
      body = await parseJsonBody(request, loginSchema)
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Geçersiz istek' }, { status: 400 })
    }
    const { username, password } = body

    const db = getDatabase()

    // Kullanıcıyı bul
    const user = db.prepare(`
      SELECT id, username, email, full_name, role, is_approved, job_title, password_hash
      FROM users
      WHERE username = ?
    `).get(username) as UserRow | undefined

    if (!user) {
      return fail('Kullanıcı adı veya şifre hatalı', { status: 401 })
    }

    if (!verifyPassword(password, user.password_hash)) {
      return fail('Kullanıcı adı veya şifre hatalı', { status: 401 })
    }

    if (isLegacySha256Hash(user.password_hash)) {
      const newHash = hashPassword(password)
      db.prepare(`
        UPDATE users
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newHash, user.id)
    }

    // Onay kontrolü
    if (!user.is_approved) {
      return fail('Hesabınız henüz onaylanmamış. Lütfen admin onayı bekleyin.', { status: 403 })
    }

    // Son giriş zamanını güncelle
    db.prepare(`
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(user.id)

    const permissions = loadUserPermissions(db, user.id)
    const accessToken = await createToken({
      userId: user.id,
      role: user.role,
      username: user.username,
      permissions,
    })
    const refreshToken = generateRefreshToken()
    const sessionId = randomUUID()
    const refreshTtlSeconds = refreshTokenTtlDays * 24 * 60 * 60
    const expiresAt = new Date(Date.now() + refreshTtlSeconds * 1000).toISOString()

    createUserSession(db, {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      expiresAt,
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for'),
    })

    const response = ok({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        job_title: user.job_title,
        permissions,
      },
    })
    setAuthCookies(response, accessToken, refreshToken, accessTokenTtlSeconds, refreshTtlSeconds)
    return response
  } catch (error: any) {
    console.error('Login hatası:', error?.message || error, error?.stack)
    const errorMessage = error?.message || error?.toString() || 'Sunucu hatası oluştu. Lütfen tekrar deneyin.'
    return fail(errorMessage, { status: 500 })
  }
}




