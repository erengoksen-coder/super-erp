import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

type ConversionInput = {
  material_id?: string | null
  from_unit?: string
  to_unit?: string
  factor?: number
}

// GET: Birim dönüşümlerini getir
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('material_id')
    const fromUnit = searchParams.get('from_unit')
    const toUnit = searchParams.get('to_unit')

    const db = getDatabase()
    let query = `
      SELECT *
      FROM unit_conversions
      WHERE deleted_at IS NULL
    `
    const params: Array<string | null> = []

    if (materialId) {
      query += ' AND material_id = ?'
      params.push(materialId)
    }
    if (fromUnit) {
      query += ' AND from_unit = ?'
      params.push(fromUnit.trim().toLowerCase())
    }
    if (toUnit) {
      query += ' AND to_unit = ?'
      params.push(toUnit.trim().toLowerCase())
    }

    query += ' ORDER BY from_unit, to_unit'
    const conversions = db.prepare(query).all(...params)
    return NextResponse.json(conversions)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Birim dönüşümü ekle
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request) as ConversionInput
    const { material_id, from_unit, to_unit, factor } = body

    if (!from_unit || !to_unit || !factor || factor <= 0) {
      return NextResponse.json(
        { error: 'from_unit, to_unit ve factor (pozitif) gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO unit_conversions (id, material_id, from_unit, to_unit, factor)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      material_id || null,
      from_unit.trim().toLowerCase(),
      to_unit.trim().toLowerCase(),
      factor
    )

    return NextResponse.json({ success: true, id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// DELETE: Birim dönüşümü sil
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    db.prepare(`
      UPDATE unit_conversions
      SET deleted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// PATCH: Birim dönüşümü güncelle
export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request) as ConversionInput & { id?: string }
    const { id, material_id, from_unit, to_unit, factor } = body

    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }

    if (!from_unit || !to_unit || !factor || factor <= 0) {
      return NextResponse.json(
        { error: 'from_unit, to_unit ve factor (pozitif) gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    db.prepare(`
      UPDATE unit_conversions
      SET material_id = ?,
          from_unit = ?,
          to_unit = ?,
          factor = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(
      material_id || null,
      from_unit.trim().toLowerCase(),
      to_unit.trim().toLowerCase(),
      factor,
      id
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

