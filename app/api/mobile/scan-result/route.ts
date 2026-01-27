import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Bilgisayar tarafından barkod bilgisini sorgula
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'code gerekli' },
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

    // Barkod bilgisini oku
    const result = db.prepare('SELECT * FROM mobile_scan_results WHERE code = ?').get(code) as any

    if (result) {
      // Okunduktan sonra sil
      db.prepare('DELETE FROM mobile_scan_results WHERE code = ?').run(code)
      
      return NextResponse.json({
        barcode: result.barcode,
        timestamp: result.created_at,
      })
    }

    return NextResponse.json({
      barcode: null,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
