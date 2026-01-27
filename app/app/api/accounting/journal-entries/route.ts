import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Yevmiye kayıtlarını listele
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const db = getDatabase()
    
    let query = `
      SELECT 
        je.*,
        COUNT(jel.id) as line_count
      FROM journal_entries je
      LEFT JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
    `
    const params: any[] = []

    if (startDate && endDate) {
      query += ' WHERE date(je.entry_date) >= date(?) AND date(je.entry_date) <= date(?)'
      params.push(startDate, endDate)
    }

    query += ' GROUP BY je.id ORDER BY je.entry_date DESC, je.entry_number DESC'

    const entries = db.prepare(query).all(...params)

    return NextResponse.json(entries)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Manuel yevmiye kaydı oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { createJournalEntry } = await import('@/lib/utils/accounting')
    
    const entryId = await createJournalEntry(body)
    
    return NextResponse.json({ 
      success: true, 
      id: entryId,
      message: 'Yevmiye kaydı oluşturuldu' 
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

