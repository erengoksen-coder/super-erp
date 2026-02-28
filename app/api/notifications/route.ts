import { NextRequest } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { ok, fail } from '@/lib/api/response'
import { withAuth } from '@/lib/api/withAuth'

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const db = getDatabase()
    const url = new URL(req.url)
    // Eğer user_id parametresi gelmezse, mevcut oturumdaki kullanıcıyı kullan
    const targetUserId = url.searchParams.get('user_id') || user.userId
    const unreadOnly = url.searchParams.get('unread_only') === 'true'
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)

    let sql = `SELECT * FROM notifications WHERE user_id = ?`
    const params: any[] = [targetUserId]

    if (unreadOnly) {
      sql += ` AND (is_read = 0 OR is_read IS NULL)`
    }

    sql += ` ORDER BY created_at DESC LIMIT ?`
    params.push(limit)

    const rows = db.prepare(sql).all(...params)

    // Okunmamış sayısını da dönelim (opsiyonel ama kullanışlı)
    const unread = db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND (is_read = 0 OR is_read IS NULL)`).get(targetUserId) as any

    return ok(rows, { meta: { total: rows.length }, unread_count: unread?.c || 0 } as any)
  } catch (e: any) {
    return fail(e.message || 'Bildirimler alınamadı')
  }
})

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const db = getDatabase()
    const body = await req.json()
    const id = randomUUID()
    db.prepare(`INSERT INTO notifications (id, user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, body.user_id || null, body.title || 'Bildirim', body.message || '', body.type || 'info', body.link || null)
    return ok({ id, message: 'Bildirim oluşturuldu' }, { status: 201 })
  } catch (e: any) {
    return fail(e.message || 'Bildirim oluşturulamadı')
  }
})

export const PATCH = withAuth(async (req: NextRequest, user) => {
  try {
    const db = getDatabase()
    const body = await req.json()

    if (body.mark_all_read) {
      db.prepare(`UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND (is_read = 0 OR is_read IS NULL)`).run(user.userId)
      return ok({ message: 'Tüm bildirimler okundu' })
    }

    if (body.id) {
      // Sadece kendi bildirimini okundu işaretleyebilir
      const result = db.prepare(`UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`).run(body.id, user.userId)
      if (result.changes === 0) return fail('Bildirim bulunamadı veya yetki yok', { status: 404 })
      return ok({ message: 'Bildirim okundu' })
    }

    return fail('id veya mark_all_read gerekli', { status: 400 })
  } catch (e: any) {
    return fail(e.message || 'İşlem başarısız')
  }
})
