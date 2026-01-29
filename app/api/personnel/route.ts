import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getDatabase } from '@/lib/database/db'

type PersonnelRow = {
  id: string
  full_name: string
  role: string | null
  phone: string | null
  email: string | null
  hourly_rate: number | null
  is_active: number
}

// GET: Personeli listele
export async function GET() {
  try {
    const db = getDatabase()
    const personnel = db.prepare(`
      SELECT *
      FROM personnel
      WHERE deleted_at IS NULL
      ORDER BY full_name
    `).all() as PersonnelRow[]
    return NextResponse.json(personnel)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Personel oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { full_name, role, phone, email, hourly_rate } = body || {}

    if (!full_name || !String(full_name).trim()) {
      return NextResponse.json({ error: 'full_name gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO personnel
      (id, full_name, role, phone, email, hourly_rate, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      String(full_name).trim(),
      role ? String(role).trim() : null,
      phone ? String(phone).trim() : null,
      email ? String(email).trim() : null,
      Number(hourly_rate) || 0
    )

    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Personel güncelle
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, full_name, role, phone, email, hourly_rate, is_active } = body || {}

    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const existing = db.prepare('SELECT id FROM personnel WHERE id = ? AND deleted_at IS NULL').get(id) as { id: string } | undefined
    if (!existing) {
      return NextResponse.json({ error: 'Personel bulunamadı' }, { status: 404 })
    }

    db.prepare(`
      UPDATE personnel
      SET full_name = COALESCE(?, full_name),
          role = COALESCE(?, role),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          hourly_rate = COALESCE(?, hourly_rate),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      full_name !== undefined ? String(full_name).trim() : null,
      role !== undefined ? (role ? String(role).trim() : null) : null,
      phone !== undefined ? (phone ? String(phone).trim() : null) : null,
      email !== undefined ? (email ? String(email).trim() : null) : null,
      hourly_rate !== undefined ? Number(hourly_rate) || 0 : null,
      is_active !== undefined ? Number(is_active) : null,
      id
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Personel sil
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    db.prepare(`
      UPDATE personnel
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}