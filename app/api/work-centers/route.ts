import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getDatabase } from '@/lib/database/db'

type WorkCenterRow = {
  id: string
  code: string | null
  name: string
  location: string | null
  capacity: number | null
  is_active: number
}

// GET: İstasyonları listele
export async function GET() {
  try {
    const db = getDatabase()
    const centers = db.prepare(`
      SELECT *
      FROM work_centers
      WHERE deleted_at IS NULL
      ORDER BY name
    `).all() as WorkCenterRow[]
    return NextResponse.json(centers)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: İstasyon oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, location, capacity } = body || {}

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'name gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO work_centers
      (id, code, name, location, capacity, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      code ? String(code).trim() : null,
      String(name).trim(),
      location ? String(location).trim() : null,
      Number(capacity) || 1
    )

    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: İstasyon güncelle
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, code, name, location, capacity, is_active } = body || {}

    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const existing = db.prepare('SELECT id FROM work_centers WHERE id = ? AND deleted_at IS NULL').get(id) as { id: string } | undefined
    if (!existing) {
      return NextResponse.json({ error: 'İstasyon bulunamadı' }, { status: 404 })
    }

    db.prepare(`
      UPDATE work_centers
      SET code = COALESCE(?, code),
          name = COALESCE(?, name),
          location = COALESCE(?, location),
          capacity = COALESCE(?, capacity),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      code !== undefined ? (code ? String(code).trim() : null) : null,
      name !== undefined ? (name ? String(name).trim() : null) : null,
      location !== undefined ? (location ? String(location).trim() : null) : null,
      capacity !== undefined ? Number(capacity) || 1 : null,
      is_active !== undefined ? Number(is_active) : null,
      id
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: İstasyon sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    db.prepare(`
      UPDATE work_centers
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}