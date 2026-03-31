import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'

// GET: Malzeme fiyat geçmişi
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('material_id')
    const db = getDatabase()

    let query = `
      SELECT mp.*, m.name as material_name, m.code as material_code, m.unit as material_unit
      FROM material_prices mp
      JOIN materials m ON mp.material_id = m.id
      WHERE mp.deleted_at IS NULL
    `
    const params: string[] = []

    if (materialId) {
      query += ' AND mp.material_id = ?'
      params.push(materialId)
    }

    query += ' ORDER BY mp.created_at DESC'
    const rows = db.prepare(query).all(...params)
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
