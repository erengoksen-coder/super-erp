import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Tek cari hesap detayı
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const db = getDatabase()
    const resolvedParams = await Promise.resolve(params)
    const accountId = resolvedParams.id

    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId) as any

    if (!account) {
      return NextResponse.json({ error: 'Cari hesap bulunamadı' }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

