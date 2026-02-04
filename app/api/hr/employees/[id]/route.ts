import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// GET: Çalışan detayı
export const GET = withAuth(async (_request: NextRequest, _user, context?: { params?: { id?: string } }) => {
  try {
    const id = context?.params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const employee = db.prepare(`
      SELECT *
      FROM hr_employees
      WHERE id = ? AND deleted_at IS NULL
    `).get(id)
    if (!employee) {
      return NextResponse.json({ error: 'Çalışan bulunamadı' }, { status: 404 })
    }
    return NextResponse.json(employee)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// PATCH: Çalışan güncelle
export const PATCH = withAuth(async (request: NextRequest, _user, context?: { params?: { id?: string } }) => {
  try {
    const id = context?.params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const body = await parseJsonBody(request)
    const { full_name, email, phone, status } = body || {}

    const db = getDatabase()
    const existing = db.prepare('SELECT id FROM hr_employees WHERE id = ? AND deleted_at IS NULL').get(id) as { id: string } | undefined
    if (!existing) {
      return NextResponse.json({ error: 'Çalışan bulunamadı' }, { status: 404 })
    }

    db.prepare(`
      UPDATE hr_employees
      SET full_name = COALESCE(?, full_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      full_name ? String(full_name).trim() : null,
      email ? String(email).trim() : null,
      phone ? String(phone).trim() : null,
      status ? String(status).trim() : null,
      id
    )

    return NextResponse.json({ id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// DELETE: Çalışan sil (soft delete)
export const DELETE = withAuth(async (_request: NextRequest, _user, context?: { params?: { id?: string } }) => {
  try {
    const id = context?.params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    db.prepare(`
      UPDATE hr_employees
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(id)
    return NextResponse.json({ id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
