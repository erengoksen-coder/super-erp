import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Defter-i Kebir kayıtlarını getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('account_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const db = getDatabase()
    
    let query = `
      SELECT 
        gl.*,
        coa.code as account_code,
        coa.name as account_name,
        je.entry_number,
        je.description as entry_description
      FROM general_ledger gl
      JOIN chart_of_accounts coa ON gl.account_id = coa.id
      JOIN journal_entries je ON gl.journal_entry_id = je.id
      WHERE 1=1
    `
    const params: any[] = []

    if (accountId) {
      query += ' AND gl.account_id = ?'
      params.push(accountId)
    }

    if (startDate) {
      query += ' AND date(gl.entry_date) >= date(?)'
      params.push(startDate)
    }

    if (endDate) {
      query += ' AND date(gl.entry_date) <= date(?)'
      params.push(endDate)
    }

    query += ' ORDER BY gl.entry_date ASC, gl.created_at ASC'

    const entries = db.prepare(query).all(...params)

    return NextResponse.json(entries)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


