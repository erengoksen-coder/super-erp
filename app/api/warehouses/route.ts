import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID } from '@/lib/database/db'
import { randomUUID } from 'crypto'

type WarehouseInput = {
  code?: string
  name?: string
}

// GET: Depoları listele
export async function GET() {
  try {
    const db = getDatabase()
    const warehouses = db.prepare(`
      SELECT *
      FROM warehouses
      WHERE deleted_at IS NULL
        AND company_id = ? AND branch_id = ?
      ORDER BY code ASC
    `).all(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)
    return NextResponse.json(warehouses)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Depo oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as WarehouseInput
    const { code, name } = body

    if (!code || !name) {
      return NextResponse.json({ error: 'code ve name gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO warehouses (id, code, name, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, code, name, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

    return NextResponse.json({ success: true, id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Depo pasife al
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    db.prepare('UPDATE warehouses SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL').run(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
