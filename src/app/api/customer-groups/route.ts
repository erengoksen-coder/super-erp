import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { randomUUID } from 'crypto'

const DEFAULT_COMPANY_ID = 'company_default'

// GET: Müşteri gruplarını listele
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT * FROM customer_groups WHERE deleted_at IS NULL ORDER BY name
    `).all() as any[]
    return ok(rows)
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

// POST: Yeni müşteri grubu
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}))
    const { name, code, description } = body
    if (!name || !String(name).trim()) return fail('Grup adı gerekli', { status: 400 })
    const db = getDatabase()
    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO customer_groups (id, name, code, description, company_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, String(name).trim(), code?.trim() || null, description?.trim() || null, DEFAULT_COMPANY_ID, now, now)
    return ok({ id, name: String(name).trim() })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})
