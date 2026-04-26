import { NextRequest, NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { createToken, accessTokenTtlSeconds } from '@/lib/auth/jwt'
import { sendUserRegistrationNotification } from '@/lib/messaging/user-notification'
import { apiLogger } from '@/lib/api/logger'
import {
    createUserSession,
    generateRefreshToken,
    hashToken,
    refreshTokenTtlDays,
    setAuthCookies,
} from '@/lib/auth/session'
import { ok, fail } from '@/lib/api/response'

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export async function POST(request: NextRequest) {
    try {
        const { idToken } = await request.json()

        if (!idToken) {
            return NextResponse.json({ error: 'ID Token eksik' }, { status: 400 })
        }

        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        })

        const payload = ticket.getPayload()
        if (!payload || !payload.email) {
            return NextResponse.json({ error: 'Geçersiz Google token' }, { status: 400 })
        }

        const { email, name, sub: googleId, picture } = payload
        const db = getDatabase()

        // Email ile kullanıcıyı bul
        let user = db.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL').get(email) as any

        let isNewUser = false

        if (!user) {
            // Yeni kullanıcı oluştur
            isNewUser = true
            const userId = randomUUID()
            let username = email.split('@')[0]

            const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
            if (existingUsername) {
                username = `${username}_${Math.floor(Math.random() * 1000)}`
            }

            db.prepare(`
        INSERT INTO users (id, username, email, full_name, role, is_approved, company_id, branch_id, avatar_url)
        VALUES (?, ?, ?, ?, 'user', 0, ?, ?, ?)
      `).run(userId, username, email, name || null, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, picture || null)

            const roleId = 'role_user'
            db.prepare(`INSERT OR IGNORE INTO user_roles (id, user_id, role_id, company_id, branch_id) VALUES (?, ?, ?, ?, ?)`).run(
                `ur_${userId}_${roleId}`,
                userId,
                roleId,
                DEFAULT_COMPANY_ID,
                DEFAULT_BRANCH_ID
            )

            user = { id: userId, username, email, role: 'user', full_name: name, is_approved: 0 }

            await sendUserRegistrationNotification({
                username,
                email,
                full_name: name,
                role: 'user',
                method: 'google'
            })
        }

        if (!user.is_approved) {
            return NextResponse.json({
                success: false,
                error: 'Hesabınız henüz onaylanmamış. Lütfen admin onayı bekleyin.'
            }, { status: 403 })
        }

        // === TEK OTURUM ZORUNLULUĞU ===
        const sessionToken = randomUUID()
        db.prepare(`DELETE FROM user_sessions WHERE user_id = ?`).run(user.id)
        try {
            db.exec(`ALTER TABLE users ADD COLUMN active_session_token TEXT`)
        } catch (_) { }
        db.prepare(`UPDATE users SET active_session_token = ? WHERE id = ?`).run(sessionToken, user.id)

        // Token oluştur
        const accessToken = await createToken({
            userId: user.id,
            role: user.role,
            username: user.username,
            sessionToken,
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

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                full_name: user.full_name,
            },
            accessToken
        })

        const forwardedProto = request.headers.get('x-forwarded-proto')
        const isSecure = forwardedProto === 'https' || process.env.NODE_ENV === 'production' || process.env.HTTPS === 'true'
        setAuthCookies(response, accessToken, refreshToken, accessTokenTtlSeconds, refreshTtlSeconds, { isSecure })

        return response

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        apiLogger.error('Google Auth Error', { error: msg })
        return NextResponse.json({ error: 'Google girişi başarısız: ' + msg }, { status: 500 })
    }
}
