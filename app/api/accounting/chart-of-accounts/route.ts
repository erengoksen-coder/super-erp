import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { logger } from '@/lib/utils/logger'
import { randomUUID } from 'crypto'
import { getDatabase } from '@/lib/database/db'

// GET: Hesap planını getir
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = getDatabase()
    const accounts = db.prepare(`
      SELECT 
        coa.*,
        (SELECT COUNT(*) FROM chart_of_accounts WHERE parent_id = coa.id) as child_count
      FROM chart_of_accounts coa
      ORDER BY coa.code ASC
    `).all()

    return ok(accounts, { headers: CACHE_HEADERS_SHORT })
  } catch (error: any) {
    try {
      await logger.error('[Chart of Accounts API] GET failed', {
        message: error?.message,
        stack: error?.stack,
      })
    } catch {}
    return fail(error.message, { status: 500 })
  }
})

type ChartAccountInput = {
  code?: string
  name?: string
  account_type?: string
  parent_id?: string | null
}

// POST: Hesap planına yeni hesap ekle
export const POST = withAuth(async (request: NextRequest) => {
  try {
    let body: ChartAccountInput
    try {
      body = await parseJsonBody(request) as ChartAccountInput
    } catch {
      return fail('Geçersiz JSON', { status: 400 })
    }

    const { code, name, account_type, parent_id } = body

    if (!code?.trim() || !name?.trim()) {
      return fail('Kod ve hesap adı zorunludur', { status: 400 })
    }
    if (!account_type?.trim()) {
      return fail('Hesap tipi zorunludur', { status: 400 })
    }

    const db = getDatabase()

    const existing = db.prepare('SELECT id FROM chart_of_accounts WHERE code = ?').get(code.trim()) as { id: string } | undefined
    if (existing) {
      return fail('Bu hesap kodu zaten kullanılıyor', { status: 409 })
    }

    if (parent_id) {
      const parent = db.prepare('SELECT id FROM chart_of_accounts WHERE id = ?').get(parent_id) as { id: string } | undefined
      if (!parent) {
        return fail('Üst hesap bulunamadı', { status: 404 })
      }
    }

    const id = randomUUID()
    db.prepare(`
      INSERT INTO chart_of_accounts
      (id, code, name, account_type, type, parent_id, balance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      code.trim(),
      name.trim(),
      account_type.trim(),
      account_type.trim(),
      parent_id || null
    )

    return ok({ id }, { message: 'Hesap oluşturuldu', status: 201 })
  } catch (error: any) {
    try {
      await logger.error('[Chart of Accounts API] POST failed', {
        message: error?.message,
        stack: error?.stack,
      })
    } catch {}
    return fail(error.message, { status: 500 })
  }
})
