import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

type ConfigInput = {
  provider?: string
  config?: Record<string, unknown>
  is_active?: boolean
}

// GET: Entegratör konfigürasyonları
export async function GET() {
  try {
    const db = getDatabase()
    const configs = db.prepare(`
      SELECT id, provider, config_json, is_active, created_at, updated_at
      FROM e_invoice_integrations
      ORDER BY created_at DESC
    `).all()
    return NextResponse.json(configs)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Yeni entegratör konfigürasyonu kaydet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ConfigInput
    const { provider, config, is_active } = body

    if (!provider || !config) {
      return NextResponse.json({ error: 'provider ve config gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const id = randomUUID()

    if (is_active) {
      db.prepare('UPDATE e_invoice_integrations SET is_active = 0').run()
    }

    db.prepare(`
      INSERT INTO e_invoice_integrations (id, provider, config_json, is_active)
      VALUES (?, ?, ?, ?)
    `).run(id, provider, JSON.stringify(config), is_active ? 1 : 0)

    return NextResponse.json({ success: true, id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: Aktif konfigürasyonu değiştir
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as { id?: string; is_active?: boolean }
    if (!body.id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    if (body.is_active) {
      db.prepare('UPDATE e_invoice_integrations SET is_active = 0').run()
    }
    db.prepare(`
      UPDATE e_invoice_integrations
      SET is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(body.is_active ? 1 : 0, body.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
