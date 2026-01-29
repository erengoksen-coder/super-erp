import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getDatabase } from '@/lib/database/db'

type OperationRow = {
  id: string
  code: string | null
  name: string
  description: string | null
  standard_duration_minutes: number | null
  is_active: number
}

// GET: Operasyonları listele
export async function GET() {
  try {
    const db = getDatabase()
    const operations = db.prepare(`
      SELECT *
      FROM operations
      WHERE deleted_at IS NULL
      ORDER BY name
    `).all() as OperationRow[]
    return NextResponse.json(operations)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Operasyon oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, name, description, standard_duration_minutes } = body || {}

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'name gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO operations
      (id, code, name, description, standard_duration_minutes, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      code ? String(code).trim() : null,
      String(name).trim(),
      description ? String(description).trim() : null,
      Number(standard_duration_minutes) || 0
    )

    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Operasyon güncelle
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, code, name, description, standard_duration_minutes, is_active } = body || {}

    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const existing = db.prepare('SELECT id FROM operations WHERE id = ? AND deleted_at IS NULL').get(id) as { id: string } | undefined
    if (!existing) {
      return NextResponse.json({ error: 'Operasyon bulunamadı' }, { status: 404 })
    }

    db.prepare(`
      UPDATE operations
      SET code = COALESCE(?, code),
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          standard_duration_minutes = COALESCE(?, standard_duration_minutes),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      code !== undefined ? (code ? String(code).trim() : null) : null,
      name !== undefined ? (name ? String(name).trim() : null) : null,
      description !== undefined ? (description ? String(description).trim() : null) : null,
      standard_duration_minutes !== undefined ? Number(standard_duration_minutes) || 0 : null,
      is_active !== undefined ? Number(is_active) : null,
      id
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Operasyon sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    db.prepare(`
      UPDATE operations
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}