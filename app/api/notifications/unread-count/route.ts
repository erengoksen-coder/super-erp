import { NextRequest } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { verifyToken } from '@/lib/auth/jwt'
import { ok, fail } from '@/lib/api/response'

/** GET: Okunmamış bildirim sayısı (sidebar badge için hafif endpoint) */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : authHeader?.trim()
  const cookieToken = request.cookies.get('auth-token')?.value || request.cookies.get('access_token')?.value
  const token = headerToken || cookieToken

  if (!token) {
    return ok({ count: 0 })
  }

  const payload = await verifyToken(token)
  const userId = (payload as { userId?: string })?.userId ?? (payload as { sub?: string })?.sub
  if (!userId) {
    return ok({ count: 0 })
  }

  try {
    const db = getDatabase()
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND (is_read IS NULL OR is_read = 0)
    `).get(userId) as { count: number } | undefined
    return ok({ count: Number(row?.count ?? 0) })
  } catch (e: any) {
    return fail(e.message || 'Hata oluştu')
  }
}
