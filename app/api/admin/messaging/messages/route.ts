import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { isAdminRole } from '@/lib/auth/permissions-check'

/** GET: İki kullanıcı arası mesajları getir (admin) ?user_a=id&user_b=id&limit=200 */
export const GET = withAuth(async (request: NextRequest, user: { userId: string; role: string }) => {
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const userA = searchParams.get('user_a')
    const userB = searchParams.get('user_b')
    const limit = Math.min(Number(searchParams.get('limit')) || 200, 500)

    if (!userA || !userB) {
      return NextResponse.json({ error: 'user_a ve user_b gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const rows = db.prepare(`
      SELECT dm.id, dm.from_user_id, dm.to_user_id, dm.body, dm.read_at, dm.created_at,
             u.full_name as from_name, u.username as from_username
      FROM direct_messages dm
      JOIN users u ON u.id = dm.from_user_id
      WHERE (dm.from_user_id = ? AND dm.to_user_id = ?) OR (dm.from_user_id = ? AND dm.to_user_id = ?)
      ORDER BY dm.created_at ASC
      LIMIT ?
    `).all(userA, userB, userB, userA, limit) as any[]

    const messages = rows.map((r) => ({
      id: r.id,
      from_user_id: r.from_user_id,
      to_user_id: r.to_user_id,
      from_name: r.from_name || r.from_username,
      body: r.body,
      read_at: r.read_at,
      created_at: r.created_at,
    }))

    return NextResponse.json(messages)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
})
