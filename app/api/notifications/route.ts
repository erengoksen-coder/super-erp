import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

export const GET = withAuth(async (_request, user) => {
  try {
    const db = getDatabase()
    const list = db.prepare(`
      SELECT id, user_id, title, message, type, reference_type, reference_id, read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(user.userId) as any[]
    return NextResponse.json(list)
  } catch (e: any) {
    // Tablo henüz yoksa veya veritabanı hatası (farklı bilgisayar/ortam) 500 vermeyelim, boş liste dön
    console.warn('[notifications] GET error:', e?.message)
    return NextResponse.json([])
  }
})
