import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { getDatabase, DEFAULT_COMPANY_ID } from '@/lib/database/db'

export const GET = withAuth(async (request) => {
    try {
        const db = getDatabase()

        const sessions = db.prepare(`
      SELECT
        s.id,
        s.user_id,
        u.full_name as user_name,
        u.username,
        s.user_agent,
        s.ip_address,
        s.last_used_at,
        s.created_at,
        s.expires_at,
        CASE WHEN s.revoked_at IS NOT NULL THEN 'revoked'
             WHEN s.expires_at < datetime('now') THEN 'expired'
             ELSE 'active' END as status
      FROM user_sessions s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.deleted_at IS NULL
      ORDER BY s.last_used_at DESC
      LIMIT 100
    `).all() as any[]

        const stats = {
            total: sessions.length,
            active: sessions.filter((s: any) => s.status === 'active').length,
            expired: sessions.filter((s: any) => s.status === 'expired').length,
        }

        return ok({ sessions, stats })
    } catch (error: any) {
        return fail(error.message, { status: 500 })
    }
})

export const DELETE = withAuth(async (request) => {
    try {
        const db = getDatabase()
        const { sessionId } = await request.json()

        if (!sessionId) return fail('Session ID gerekli', { status: 400 })

        db.prepare(
            "UPDATE user_sessions SET revoked_at = datetime('now') WHERE id = ? AND revoked_at IS NULL"
        ).run(sessionId)

        return ok({ message: 'Oturum sonlandırıldı' })
    } catch (error: any) {
        return fail(error.message, { status: 500 })
    }
})
