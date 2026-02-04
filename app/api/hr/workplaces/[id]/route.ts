import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// GET: Lokasyon detayı
export const GET = withAuth(async (_request: NextRequest, _user, context?: { params?: { id?: string } }) => {
  try {
    const id = context?.params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const workplace = db.prepare(`
      SELECT *
      FROM hr_workplaces
      WHERE id = ? AND deleted_at IS NULL
    `).get(id)
    if (!workplace) {
      return NextResponse.json({ error: 'Lokasyon bulunamadı' }, { status: 404 })
    }
    return NextResponse.json(workplace)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// PATCH: Lokasyon güncelle
export const PATCH = withAuth(async (request: NextRequest, _user, context?: { params?: { id?: string } }) => {
  try {
    const id = context?.params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const body = await parseJsonBody(request)
    const { name, address, city, country, timezone, is_active } = body || {}
    const db = getDatabase()
    const existing = db.prepare('SELECT id FROM hr_workplaces WHERE id = ? AND deleted_at IS NULL').get(id) as { id: string } | undefined
    if (!existing) {
      return NextResponse.json({ error: 'Lokasyon bulunamadı' }, { status: 404 })
    }
    db.prepare(`
      UPDATE hr_workplaces
      SET name = COALESCE(?, name),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          country = COALESCE(?, country),
          timezone = COALESCE(?, timezone),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name ? String(name).trim() : null,
      address ? String(address).trim() : null,
      city ? String(city).trim() : null,
      country ? String(country).trim() : null,
      timezone ? String(timezone).trim() : null,
      typeof is_active === 'number' ? is_active : null,
      id
    )
    return NextResponse.json({ id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// DELETE: Lokasyon sil (soft delete)
export const DELETE = withAuth(async (_request: NextRequest, _user, context?: { params?: { id?: string } }) => {
  try {
    const id = context?.params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    db.prepare(`
      UPDATE hr_workplaces
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(id)
    return NextResponse.json({ id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
