import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

/**
 * GET: Veritabanı açılabiliyor mu kontrol et (login 500 hatası ayıklamak için).
 * Tarayıcıda http://localhost:3000/api/auth/db-check açın.
 */
export async function GET() {
  try {
    const db = getDatabase()
    db.prepare('SELECT 1').get()
    return NextResponse.json({ ok: true, message: 'Veritabanı bağlantısı OK' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { ok: false, error: message },
      { status: 503 }
    )
  }
}
