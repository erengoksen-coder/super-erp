import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { parseJsonBody } from '@/lib/api/validate'

/** GET: Seçilen kullanıcıyla mesaj geçmişi (?with=userId&before=msgId&limit=50) */
export const GET = withAuth(async (request: NextRequest, user: { userId: string }) => {
  try {
    const { searchParams } = new URL(request.url)
    const withUserId = searchParams.get('with')
    const before = searchParams.get('before')
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)

    if (!withUserId) {
      return NextResponse.json({ error: 'with (userId) gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const myId = user.userId

    let rows: Array<{
      id: string
      from_user_id: string
      to_user_id: string
      body: string
      read_at: string | null
      created_at: string
    }>

    if (before) {
      rows = db.prepare(`
        SELECT id, from_user_id, to_user_id, body, read_at, created_at
        FROM direct_messages
        WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
          AND created_at < (SELECT created_at FROM direct_messages WHERE id = ?)
        ORDER BY created_at DESC
        LIMIT ?
      `).all(myId, withUserId, withUserId, myId, before, limit) as any
    } else {
      rows = db.prepare(`
        SELECT id, from_user_id, to_user_id, body, read_at, created_at
        FROM direct_messages
        WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
        ORDER BY created_at DESC
        LIMIT ?
      `).all(myId, withUserId, withUserId, myId, limit) as any
    }

    const messages = rows.reverse().map((r) => ({
      id: r.id,
      from_user_id: r.from_user_id,
      to_user_id: r.to_user_id,
      body: r.body,
      read_at: r.read_at,
      created_at: r.created_at,
      is_mine: r.from_user_id === myId,
    }))

    return NextResponse.json(messages)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
})

/** POST: Mesaj gönder { to_user_id, body } */
export const POST = withAuth(async (request: NextRequest, user: { userId: string }) => {
  try {
    const body = await parseJsonBody<{ to_user_id: string; body: string }>(request)
    if (!body?.to_user_id || typeof body.body !== 'string') {
      return NextResponse.json({ error: 'to_user_id ve body gerekli' }, { status: 400 })
    }
    const trimmedBody = body.body.trim()
    if (!trimmedBody) {
      return NextResponse.json({ error: 'Mesaj boş olamaz' }, { status: 400 })
    }

    const db = getDatabase()
    const target = db.prepare(
      'SELECT id FROM users WHERE id = ? AND is_approved = 1 AND deleted_at IS NULL'
    ).get(body.to_user_id) as { id: string } | undefined
    if (!target) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    const id = randomUUID()
    db.prepare(`
      INSERT INTO direct_messages (id, from_user_id, to_user_id, body)
      VALUES (?, ?, ?, ?)
    `).run(id, user.userId, body.to_user_id, trimmedBody)

    const row = db.prepare(
      'SELECT id, from_user_id, to_user_id, body, read_at, created_at FROM direct_messages WHERE id = ?'
    ).get(id) as any

    return NextResponse.json({
      id: row.id,
      from_user_id: row.from_user_id,
      to_user_id: row.to_user_id,
      body: row.body,
      read_at: row.read_at,
      created_at: row.created_at,
      is_mine: true,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
})
