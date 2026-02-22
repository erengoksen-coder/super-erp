import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { verifyToken } from '@/lib/auth/jwt'

/** GET: Token yoksa veya geçersizse 401 yerine boş liste döner (konsol 401 hatası önlenir). */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : authHeader?.trim()
  const cookieToken = request.cookies.get('auth-token')?.value || request.cookies.get('access_token')?.value
  const token = headerToken || cookieToken

  if (!token) {
    return NextResponse.json([])
  }

  const payload = await verifyToken(token)
  const userId = (payload as any)?.userId ?? (payload as any)?.sub
  if (!userId) {
    return NextResponse.json([])
  }

  try {
    const db = getDatabase()
    const list = db.prepare(`
      SELECT id, user_id, title, message, type, reference_type, reference_id, read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(userId) as any[]
    return NextResponse.json(list)
  } catch (e: unknown) {
    const { apiLogger } = await import('@/lib/api/logger')
    apiLogger.error('Notifications GET failed', { error: e instanceof Error ? e.message : String(e) })
    return NextResponse.json([])
  }
}
