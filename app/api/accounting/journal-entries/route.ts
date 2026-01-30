import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

// GET: Yevmiye kayıtlarını listele
export const GET = withAuth(async (request: NextRequest) => {
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
})

// POST: Manuel yevmiye kaydı oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
    }
    const { createJournalEntry } = await import('@/lib/utils/accounting')

    if (!body || !Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json({ error: 'Yevmiye satırları gerekli' }, { status: 400 })
    }

    const entryId = await createJournalEntry(body)
    
    return NextResponse.json({ 
      success: true, 
      id: entryId,
      message: 'Yevmiye kaydı oluşturuldu' 
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})


