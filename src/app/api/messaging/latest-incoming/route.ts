import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

/** GET: Bana gelen en son mesaj (bildirim/ses için; hangi sohbet açık olursa olsun) */
export const GET = withAuth(async (_request: NextRequest, user: { userId: string }) => {
  try {
    const db = getDatabase()
    const row = db.prepare(`
      SELECT dm.id, dm.from_user_id, dm.body, dm.created_at,
             u.full_name as from_name, u.username as from_username
      FROM direct_messages dm
      JOIN users u ON u.id = dm.from_user_id AND u.deleted_at IS NULL
      WHERE dm.to_user_id = ?
      ORDER BY dm.created_at DESC
      LIMIT 1
    `).get(user.userId) as {
      id: string
      from_user_id: string
      body: string
      created_at: string
      from_name: string | null
      from_username: string
    } | undefined

    if (!row) {
      return NextResponse.json(null)
    }

    return NextResponse.json({
      id: row.id,
      from_user_id: row.from_user_id,
      from_name: row.from_name || row.from_username || row.from_user_id,
      body: row.body,
      created_at: row.created_at,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
})
