import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { logger } from '@/lib/utils/logger'
import { getDatabase } from '@/lib/database/db'

// GET: Yevmiye kayıtlarını listele
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const referenceId = searchParams.get('reference_id')

    const db = getDatabase()

    let query = `
      SELECT 
        je.*,
        COUNT(jel.id) as line_count
      FROM journal_entries je
      LEFT JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
    `
    const params: any[] = []
    const where: string[] = []

    if (startDate && endDate) {
      where.push('date(je.entry_date) >= date(?) AND date(je.entry_date) <= date(?)')
      params.push(startDate, endDate)
    }

    if (referenceId) {
      where.push('je.reference_id = ?')
      params.push(referenceId)
    }

    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ')
    }

    query += ' GROUP BY je.id ORDER BY je.entry_date DESC, je.entry_number DESC'

    const entries = db.prepare(query).all(...params)

    return ok(entries, { headers: CACHE_HEADERS_SHORT })
  } catch (error: any) {
    try {
      await logger.error('[Journal Entries API] GET failed', {
        message: error?.message,
        stack: error?.stack,
      })
    } catch { }
    return fail(error.message, { status: 500 })
  }
})

// POST: Manuel yevmiye kaydı oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    let body: any
    try {
      body = await parseJsonBody(request)
    } catch {
      return fail('Geçersiz JSON', { status: 400 })
    }
    const { createJournalEntry } = await import('@/lib/utils/accounting')

    if (!body || !Array.isArray(body.lines) || body.lines.length === 0) {
      return fail('Yevmiye satırları gerekli', { status: 400 })
    }

    const entryId = await createJournalEntry(body)

    return ok({ id: entryId }, { message: 'Yevmiye kaydı oluşturuldu', status: 201 })
  } catch (error: any) {
    try {
      await logger.error('[Journal Entries API] POST failed', {
        message: error?.message,
        stack: error?.stack,
      })
    } catch { }
    return fail(error.message, { status: 500 })
  }
})



