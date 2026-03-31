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
  is_locked?: number
  job_title: string | null
  password_hash: string
  dealer_name?: string | null
  company_id: string
  branch_id: string
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
      return fail('Çok fazla deneme. Lütfen sonra tekrar deneyin.', {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((limit.reset - Date.now()) / 1000).toString(),
        },
      })
    }

    let body: z.infer<typeof loginSchema>
    try {
      body = await parseJsonBody(request, loginSchema)
    } catch (error: any) {
      return fail(error.message || 'Geçersiz istek', { status: 400 })
    }
    const { username, password } = body

    const db = getDatabase()

    // Kullanıcıyı bul (büyük/küçük harf duyarsız; farklı bilgisayar/klavye için)
    const user = db.prepare(`
      SELECT id, username, email, full_name, role, is_approved, COALESCE(is_locked, 0) as is_locked, job_title, password_hash, dealer_name, company_id, branch_id
      FROM users
      WHERE LOWER(TRIM(username)) = LOWER(TRIM(?)) AND deleted_at IS NULL
    `).get(username) as UserRow | undefined

    if (!user) {
      return fail('Kullanıcı adı veya şifre hatalı', { status: 401 })
    }

    if (!verifyPassword(password, user.password_hash)) {
      return fail('Kullanıcı adı veya şifre hatalı', { status: 401 })
    }

    if (user.is_locked) {
      return fail('Hesabınız kilitlendi. Yönetici ile iletişime geçin.', { status: 403 })
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

    db.prepare(`
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(user.id)

    // AUDIT LOG: Giriş işlemi
    const { AuditService } = await import('@/lib/services/audit')
    await AuditService.log({
      userId: user.id,
      companyId: user.company_id,
      branchId: user.branch_id,
      actionType: 'LOGIN',
      entityName: 'users',
      entityId: user.id,
      description: `Sisteme giriş yapıldı: ${user.username}`,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || undefined
    })

    const permissions = loadUserPermissions(db, user.id)
    // JWT'ye izin listesi eklenmez; cookie 4KB sınırını aşmasın diye (Ngrok/farklı bilgisayar). İzinler /api/auth/me ile alınır.
    const accessToken = await createToken({
      userId: user.id,
      role: user.role,
      username: user.username,
      companyId: user.company_id,
      branchId: user.branch_id,
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

    // accessToken body'de de dönülür; ngrok/farklı domain'de cookie gitmeyince client Authorization header ile gönderir
    const response = ok({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        job_title: user.job_title,
        permissions,
        dealer_name: user.dealer_name ?? null,
      },
      accessToken,
    })
    setAuthCookies(response, accessToken, refreshToken, accessTokenTtlSeconds, refreshTtlSeconds)
    return response
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    const { apiLogger } = await import('@/lib/api/logger')
    apiLogger.error('Login hatası', { message, stack })
    const errorMessage = message || 'Sunucu hatası oluştu. Lütfen tekrar deneyin.'
    return fail(errorMessage, { status: 500 })
  }
}




