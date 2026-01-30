import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

// GET: Uyarıları getir
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'open'
    const db = getDatabase()
    const alerts = db.prepare(`
      SELECT sa.*, m.name as material_name, m.code as material_code, m.unit as material_unit
      FROM stock_alerts sa
      JOIN materials m ON sa.material_id = m.id
      WHERE sa.deleted_at IS NULL AND sa.status = ?
      ORDER BY sa.created_at DESC
    `).all(status)
    return NextResponse.json(alerts)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// PATCH: Uyarıyı kapat
export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json() as { id?: string }
    if (!body.id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    db.prepare(`
      UPDATE stock_alerts
      SET status = 'resolved',
          resolved_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(body.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
