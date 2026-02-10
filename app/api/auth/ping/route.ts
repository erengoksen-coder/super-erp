import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { verifyToken } from '@/lib/auth/jwt'

/** GET: Hafif heartbeat. Auth yoksa 200 döner; varsa last_activity günceller (çevrimiçi listesi). */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '').trim()
    : request.cookies.get('auth-token')?.value ?? request.cookies.get('access_token')?.value
  if (token) {
    try {
      const payload = await verifyToken(token)
      if (payload?.userId) {
        const db = getDatabase()
        db.prepare('UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE id = ?').run(payload.userId)
      }
    } catch {
      // Token geçersizse sadece ok dön, 401 verme
    }
  }
  return NextResponse.json({ ok: true })
}
