import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

// POST: Telefondan gelen barkod bilgisini kaydet
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { code, barcode } = body

    if (!code || !barcode) {
      return NextResponse.json(
        { error: 'code ve barcode gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    
    // Geçici tablo oluştur (eğer yoksa)
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS mobile_scan_results (
          code TEXT PRIMARY KEY,
          barcode TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
    } catch {}

    // Eski kayıtları temizle (5 dakikadan eski)
    const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString()
    db.prepare('DELETE FROM mobile_scan_results WHERE created_at < ?').run(fiveMinutesAgo)

    // Barkod bilgisini kaydet (varsa güncelle)
    db.prepare(`
      INSERT OR REPLACE INTO mobile_scan_results (code, barcode, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(code, barcode)

    return NextResponse.json({
      success: true,
      message: 'Barkod kaydedildi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
