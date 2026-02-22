import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

/** GET: Giriş yapan kullanıcının son mesajlaştığı kişileri listele (Instagram tarzı “aktif” listesi) */
export const GET = withAuth(async (_request: NextRequest, user: { userId: string }) => {
  try {
    const db = getDatabase()
    const myId = user.userId
    const limit = 10

    const rows = db.prepare(`
      SELECT other_id, MAX(created_at) AS last_at
      FROM (
        SELECT to_user_id AS other_id, created_at FROM direct_messages WHERE from_user_id = ?
        UNION ALL
        SELECT from_user_id AS other_id, created_at FROM direct_messages WHERE to_user_id = ?
      )
      GROUP BY other_id
      ORDER BY last_at DESC
      LIMIT ?
    `).all(myId, myId, limit) as Array<{ other_id: string; last_at: string }>

    if (rows.length === 0) {
      return NextResponse.json([])
    }

    const ids = rows.map((r) => r.other_id)
    const placeholders = ids.map(() => '?').join(',')
    const users = db.prepare(`
      SELECT id, username, full_name
      FROM users
      WHERE id IN (${placeholders}) AND deleted_at IS NULL
    `).all(...ids) as Array<{ id: string; username: string; full_name: string | null }>

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]))
    const result = rows
      .map((r) => {
        const u = userMap[r.other_id]
        if (!u) return null
        return {
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          last_message_at: r.last_at,
        }
      })
      .filter(Boolean)

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
})
