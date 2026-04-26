import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'

// GET: Onay bekleyen kullanıcı sayısı (sadece admin)
export const GET = withAuth(
  async () => {
    try {
      const db = getDatabase()
      const row = db.prepare(`
        SELECT COUNT(*) as count
        FROM users
        WHERE company_id = ? AND branch_id = ?
          AND deleted_at IS NULL
          AND (is_approved = 0 OR is_approved IS NULL)
      `).get(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as { count: number }
      return NextResponse.json({ count: row?.count ?? 0 })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Bekleyen kullanıcı sayısı alınamadı'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  },
  ['admin']
)
