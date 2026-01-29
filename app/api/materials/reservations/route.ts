import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { applyMaterialStockChange } from '@/lib/materials/stock'

type ReservationInput = {
  id?: string
  material_id?: string
  customer_id?: string | null
  reference_type?: string | null
  reference_id?: string | null
  quantity?: number
  notes?: string | null
}

// GET: Rezervasyonları getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('material_id')
    const customerId = searchParams.get('customer_id')

    const db = getDatabase()
    let query = `
      SELECT *
      FROM material_reservations
      WHERE deleted_at IS NULL
    `
    const params: Array<string> = []

    if (materialId) {
      query += ' AND material_id = ?'
      params.push(materialId)
    }
    if (customerId) {
      query += ' AND customer_id = ?'
      params.push(customerId)
    }

    query += ' ORDER BY created_at DESC'
    const rows = db.prepare(query).all(...params)
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Rezervasyon oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ReservationInput
    const { material_id, customer_id, reference_type, reference_id, quantity, notes } = body

    if (!material_id || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Malzeme ve pozitif miktar gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const material = db.prepare('SELECT id FROM materials WHERE id = ? AND deleted_at IS NULL').get(material_id)
    if (!material) {
      return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })
    }

    const reservationId = randomUUID()

    db.transaction(() => {
      applyMaterialStockChange(db, material_id, 0, quantity)

      db.prepare(`
        INSERT INTO material_reservations
        (id, material_id, customer_id, reference_type, reference_id, quantity, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
      `).run(
        reservationId,
        material_id,
        customer_id || null,
        reference_type || null,
        reference_id || null,
        quantity,
        notes || null
      )
    })()

    return NextResponse.json({ success: true, id: reservationId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Rezervasyon iptal et
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const reservation = db.prepare(`
      SELECT * FROM material_reservations
      WHERE id = ? AND deleted_at IS NULL
    `).get(id) as any

    if (!reservation) {
      return NextResponse.json({ error: 'Rezervasyon bulunamadı' }, { status: 404 })
    }

    db.transaction(() => {
      applyMaterialStockChange(db, reservation.material_id, 0, -reservation.quantity)

      db.prepare(`
        UPDATE material_reservations
        SET status = 'cancelled',
            deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id)
    })()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
