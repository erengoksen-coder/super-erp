import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

export const PATCH = withAuth(async (request: NextRequest, user, context?: unknown) => {
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id?: string } | Promise<{ id?: string }> } | undefined)?.params
    )
    const id = typeof resolvedParams?.id === 'string' ? resolvedParams.id : undefined
    if (!id) return fail('Bildirim ID gerekli', { status: 400 })

    const db = getDatabase()
    const row = db.prepare('SELECT id, user_id FROM notifications WHERE id = ?').get(id) as { id: string; user_id: string } | undefined
    if (!row) return fail('Bildirim bulunamadı', { status: 404 })
    if (row.user_id !== user.userId) return fail('Bu bildirimi okuma yetkiniz yok', { status: 403 })

    db.prepare('UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ?').run(id)
    return ok(null, { message: 'Okundu olarak işaretlendi' })
  } catch (e: any) {
    return fail(e?.message || 'İşlem başarısız', { status: 500 })
  }
})
