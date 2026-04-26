import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { getDatabase } from '@/lib/database/db'

// GET: Sistem ayarlarını getir
export const GET = withAuth(async (request: NextRequest) => {
    try {
        const db = getDatabase()

        // Genel ayarlar
        const settings: Record<string, string> = {}
        try {
            const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
            for (const row of rows) {
                settings[row.key] = row.value
            }
        } catch {
            // settings tablosu yoksa boş dön
        }

        return ok({
            app_name: settings.app_name || 'LIVASOFA ERP',
            company_name: settings.company_name || '',
            currency: settings.currency || 'TRY',
            language: settings.language || 'tr',
            timezone: settings.timezone || 'Europe/Istanbul',
            ...settings,
        })
    } catch (error: any) {
        return fail(error.message, { status: 500 })
    }
})

// POST: Ayarları güncelle
export const POST = withAuth(async (request: NextRequest) => {
    try {
        const body = await request.json()
        const db = getDatabase()

        // Settings tablosu yoksa oluştur
        try {
            db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT
        )
      `)
        } catch { }

        const entries = Object.entries(body)
        const upsert = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `)

        for (const [key, value] of entries) {
            upsert.run(key, String(value))
        }

        return ok({ success: true, updated: entries.length })
    } catch (error: any) {
        return fail(error.message, { status: 500 })
    }
})
