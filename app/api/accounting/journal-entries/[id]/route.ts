import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
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
  context?: { params?: { id?: string } }
) => {
  try {
    const db = getDatabase()
    const id = context?.params?.id

    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }

    // Yevmiye kaydı
    const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id) as JournalEntryRow | undefined
    if (!entry) {
      return NextResponse.json({ error: 'Yevmiye kaydı bulunamadı' }, { status: 404 })
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

    return NextResponse.json({
      entry,
      lines
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})


