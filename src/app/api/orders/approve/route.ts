import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok } from '@/lib/api/response'

/** GET: Onay bekleyen / tüm sipariş onayları listesi (admin/approvals sayfası) */
export const GET = withAuth(async () => {
  try {
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT oa.id, oa.order_id, o.order_number, o.dealer_name, o.customer_name, o.product_name,
             COALESCE(oa.order_amount, o.total_amount, 0) as order_amount,
             COALESCE(oa.threshold_amount, 0) as threshold_amount,
             oa.status, oa.requested_at, oa.approved_at, oa.notes,
             u.full_name as requested_by_name,
             u2.full_name as approved_by_name
      FROM order_approvals oa
      JOIN orders o ON oa.order_id = o.id
      LEFT JOIN users u ON oa.requested_by = u.id
      LEFT JOIN users u2 ON oa.approved_by = u2.id
      ORDER BY oa.requested_at DESC
      LIMIT 100
    `).all() as Record<string, unknown>[]
    return ok(rows)
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Liste alınamadı' },
      { status: 500 }
    )
  }
})
