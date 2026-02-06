import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

const ONLINE_THRESHOLD_MS = 15 * 60 * 1000 // 15 dakika

/** GET: Çevrimiçi kullanıcıları listele (kendim hariç, onaylı) */
export const GET = withAuth(async (request: NextRequest, user: { userId: string }) => {
  try {
    const db = getDatabase()
    const now = Date.now()
    const threshold = new Date(now - ONLINE_THRESHOLD_MS).toISOString()

    const online = db.prepare(`
      SELECT id, username, full_name
      FROM users
      WHERE id != ? AND is_approved = 1 AND deleted_at IS NULL
        AND (last_activity IS NOT NULL AND last_activity >= ?)
      ORDER BY full_name ASC, username ASC
    `).all(user.userId, threshold) as Array<{ id: string; username: string; full_name: string | null }>

    return NextResponse.json(online)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
})
