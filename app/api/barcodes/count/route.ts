import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// GET: Bugün üretilen barkod sayısını getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')

    if (!productId) {
      return NextResponse.json({ error: 'product_id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const today = new Date().toISOString().split('T')[0]

    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM product_serial_numbers 
      WHERE product_id = ? AND date(created_at) = date(?)
    `).get(productId, today) as any

    return NextResponse.json({ count: result?.count || 0 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

