import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

type WorkplaceRow = {
  id: string
  name: string
  address: string | null
  city: string | null
  country: string | null
  timezone: string | null
  is_active: number
  created_at: string
}

// GET: Lokasyonları listele
export const GET = withAuth(async () => {
  try {
    const db = getDatabase()
    const workplaces = db.prepare(`
      SELECT id, name, address, city, country, timezone, is_active, created_at
      FROM hr_workplaces
      WHERE deleted_at IS NULL
      ORDER BY name
    `).all() as WorkplaceRow[]
    return NextResponse.json(workplaces)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Yeni lokasyon oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { name, address, city, country, timezone, is_active } = body || {}
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'name gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO hr_workplaces
      (id, name, address, city, country, timezone, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      String(name).trim(),
      address ? String(address).trim() : null,
      city ? String(city).trim() : null,
      country ? String(country).trim() : null,
      timezone ? String(timezone).trim() : null,
      typeof is_active === 'number' ? is_active : 1
    )
    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
