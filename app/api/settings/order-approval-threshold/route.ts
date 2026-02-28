import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

const KEY = 'order_approval_threshold'

// GET: Onay eşiği (TL)
export const GET = withAuth(async () => {
  try {
    const db = getDatabase()
    const row = db.prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?').get(KEY) as { setting_value: string | null } | undefined
    const value = row?.setting_value ?? '50000'
    return ok({ threshold: Number(value) || 0, threshold_raw: value })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

// PATCH: Onay eşiği güncelle
export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}))
    const threshold = body?.threshold != null ? Number(body.threshold) : null
    if (threshold === null || isNaN(threshold) || threshold < 0) return fail('Geçerli bir tutar (TL) girin', { status: 400 })
    const db = getDatabase()
    const now = new Date().toISOString()
    db.prepare('UPDATE app_settings SET setting_value = ?, updated_at = ? WHERE setting_key = ?').run(String(threshold), now, KEY)
    const changed = db.prepare('SELECT changes() as c').get() as { c: number }
    if (changed.c === 0) {
      db.prepare('INSERT INTO app_settings (id, setting_key, setting_value, updated_at) VALUES (?, ?, ?, ?)').run(KEY, KEY, String(threshold), now)
    }
    return ok({ threshold })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})
