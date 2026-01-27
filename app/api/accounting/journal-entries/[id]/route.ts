import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Yevmiye kaydı detayı
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDatabase()

    // Yevmiye kaydı
    const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(params.id) as any
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
    `).all(params.id)

    return NextResponse.json({
      entry,
      lines
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


