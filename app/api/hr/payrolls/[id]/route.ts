import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

// GET: Bordro detayı ve kalemleri
export const GET = withAuth(async (_request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  try {
    const params = context?.params ? await context.params : undefined
    const id = params?.id
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })

    const db = getDatabase()
    const payroll = db.prepare(`
      SELECT p.*, e.full_name as employee_name
      FROM hr_payrolls p
      JOIN hr_employees e ON e.id = p.employee_id AND e.deleted_at IS NULL
      WHERE p.id = ? AND p.deleted_at IS NULL
    `).get(id) as any
    if (!payroll) return NextResponse.json({ error: 'Bordro bulunamadı' }, { status: 404 })

    const items = db.prepare(`
      SELECT id, type, code, description, amount
      FROM hr_payroll_items WHERE payroll_id = ? AND deleted_at IS NULL ORDER BY type, code
    `).all(id) as { id: string; type: string; code: string; description: string; amount: number }[]

    return NextResponse.json({ ...payroll, items })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
