import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

// GET: Kasa listesi (tahsilat için)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT id, name, currency, balance FROM cash_boxes WHERE deleted_at IS NULL ORDER BY name
    `).all() as { id: string; name: string; currency: string; balance: number }[]
    return ok(rows)
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})
