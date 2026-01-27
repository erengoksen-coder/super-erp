import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Hesap planını getir
export async function GET() {
  try {
    const db = getDatabase()
    const accounts = db.prepare(`
      SELECT 
        coa.*,
        (SELECT COUNT(*) FROM chart_of_accounts WHERE parent_id = coa.id) as child_count
      FROM chart_of_accounts coa
      ORDER BY coa.code ASC
    `).all()

    return NextResponse.json(accounts)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


