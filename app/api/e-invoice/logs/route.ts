import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

// GET: E-fatura loglarını getir
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoice_id')

    const db = getDatabase()
    let query = `
      SELECT *
      FROM e_invoice_logs
      WHERE 1=1
    `
    const params: string[] = []
    if (invoiceId) {
      query += ' AND invoice_id = ?'
      params.push(invoiceId)
    }
    query += ' ORDER BY created_at DESC'
    const logs = db.prepare(query).all(...params)
    return NextResponse.json(logs)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
