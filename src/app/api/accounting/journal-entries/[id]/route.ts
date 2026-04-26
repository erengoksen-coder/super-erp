import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { logger } from '@/lib/utils/logger'
import { getDatabase } from '@/lib/database/db'

type JournalEntryRow = {
  id: string
}

type JournalEntryLineRow = {
  id: string
  account_code: string
  account_name: string
  account_type: string
}

// GET: Yevmiye kaydı detayı
export const GET = withAuth(async (
  _request: NextRequest,
  _user,
  context?: unknown
) => {
  try {
    const db = getDatabase()
    const id = (context as { params?: { id?: string } } | undefined)?.params?.id

    if (!id) {
      return fail('ID gerekli', { status: 400 })
    }

    // Yevmiye kaydı
    const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id) as JournalEntryRow | undefined
    if (!entry) {
      return fail('Yevmiye kaydı bulunamadı', { status: 404 })
    }

    // Yevmiye satırları
    const lines = db.prepare(`
      SELECT 
        jel.*,
        coa.code as account_code,
        coa.name as account_name,
        coa.account_type
      FROM journal_entry_lines jel
      JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE jel.journal_entry_id = ?
      ORDER BY jel.debit DESC, jel.credit DESC
    `).all(id) as JournalEntryLineRow[]

    return ok({ entry, lines }, { headers: CACHE_HEADERS_SHORT })
  } catch (error: any) {
    try {
      await logger.error('[Journal Entries API] GET [id] failed', {
        message: error?.message,
        stack: error?.stack,
      })
    } catch {}
    return fail(error.message, { status: 500 })
  }
})


