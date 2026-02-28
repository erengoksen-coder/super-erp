import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { apiLogger } from '@/lib/api/logger'

type CountRow = { count: number }

export const GET = withAuth(async () => {
  try {
    const db = getDatabase()
    const today = new Date().toISOString().split('T')[0]

    const pendingRow = db.prepare(`
      SELECT COUNT(*) as count FROM orders
      WHERE deleted_at IS NULL AND company_id = ? AND (branch_id = ? OR branch_id IS NULL OR branch_id = '')
        AND status = 'pending'
    `).get(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as CountRow | undefined

    const inProductionRow = db.prepare(`
      SELECT COUNT(*) as count FROM orders
      WHERE deleted_at IS NULL AND company_id = ? AND (branch_id = ? OR branch_id IS NULL OR branch_id = '')
        AND status = 'in_production'
    `).get(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as CountRow | undefined

    const now = new Date()
    const dayOfWeek = now.getDay()
    const toMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + toMonday)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    const deliveriesThisWeekRow = db.prepare(`
      SELECT COUNT(*) as count FROM orders
      WHERE deleted_at IS NULL AND company_id = ? AND (branch_id = ? OR branch_id IS NULL OR branch_id = '')
        AND delivery_date IS NOT NULL AND delivery_date != ''
        AND date(delivery_date) >= ? AND date(delivery_date) <= ?
    `).get(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, weekStartStr, weekEndStr) as CountRow | undefined

    const overdueRow = db.prepare(`
      SELECT COUNT(*) as count FROM orders
      WHERE deleted_at IS NULL AND company_id = ? AND (branch_id = ? OR branch_id IS NULL OR branch_id = '')
        AND delivery_date IS NOT NULL AND delivery_date != ''
        AND date(delivery_date) < ?
        AND status NOT IN ('completed', 'cancelled')
    `).get(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, today) as CountRow | undefined

    const completedRow = db.prepare(`
      SELECT COUNT(*) as count FROM orders
      WHERE deleted_at IS NULL AND company_id = ? AND (branch_id = ? OR branch_id IS NULL OR branch_id = '')
        AND status = 'completed'
    `).get(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as CountRow | undefined

    const approvalPendingRow = db.prepare(`
      SELECT COUNT(*) as count FROM orders
      WHERE deleted_at IS NULL AND company_id = ? AND (branch_id = ? OR branch_id IS NULL OR branch_id = '')
        AND status = 'approval_pending'
    `).get(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID) as CountRow | undefined

    return NextResponse.json({
      pending: Number(pendingRow?.count ?? 0),
      approval_pending: Number(approvalPendingRow?.count ?? 0),
      in_production: Number(inProductionRow?.count ?? 0),
      completed: Number(completedRow?.count ?? 0),
      deliveriesThisWeek: Number(deliveriesThisWeekRow?.count ?? 0),
      overdue: Number(overdueRow?.count ?? 0),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sipariş özeti alınamadı'
    apiLogger.error('Orders summary failed', { error: message })
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
})
