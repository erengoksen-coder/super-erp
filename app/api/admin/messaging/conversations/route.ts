import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { isAdminRole } from '@/lib/auth/permissions-check'

/** GET: Tüm konuşmaları listele (admin) - mesajı olan kullanıcı çiftleri + son mesaj */
export const GET = withAuth(async (request: NextRequest, user: { userId: string; role: string }) => {
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }
  try {
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT from_user_id, to_user_id, body, created_at
      FROM direct_messages
      ORDER BY created_at DESC
    `).all() as Array<{ from_user_id: string; to_user_id: string; body: string; created_at: string }>

    const pairToLatest: Record<string, { body: string; at: string }> = {}
    for (const r of rows) {
      const key = [r.from_user_id, r.to_user_id].sort().join('|')
      if (!pairToLatest[key]) {
        pairToLatest[key] = { body: r.body, at: r.created_at }
      }
    }

    const dbUsers = db.prepare('SELECT id, full_name, username FROM users WHERE deleted_at IS NULL').all() as Array<{ id: string; full_name: string | null; username: string }>
    const userMap = Object.fromEntries(dbUsers.map((u) => [u.id, u.full_name || u.username || u.id]))

    const conversations = Object.entries(pairToLatest).map(([key, val]) => {
      const [userA, userB] = key.split('|')
      return {
        user_a_id: userA,
        user_b_id: userB,
        user_a_name: userMap[userA] || userA,
        user_b_name: userMap[userB] || userB,
        last_message_at: val.at,
        last_message_preview: (val.body || '').slice(0, 80),
      }
    }).sort((a, b) => (b.last_message_at > a.last_message_at ? 1 : -1))

    return NextResponse.json(conversations)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
})
