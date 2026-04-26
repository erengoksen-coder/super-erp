import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { getDatabase } from '@/lib/database/db'
import { withAuthAndPermission } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { parseJsonBody } from '@/lib/api/validate'

type WebhookRow = {
  id: string
  url: string
  events: string | null
  description: string | null
  active: number
  created_at: string
}

// GET: Kayıtlı webhook listesi
export const GET = withAuthAndPermission(async () => {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT id, url, events, description, active, created_at
    FROM webhook_endpoints
    ORDER BY created_at DESC
  `).all() as WebhookRow[]
  return ok(rows)
}, '/webhooks', 'view')

// POST: Yeni webhook ekle
export const POST = withAuthAndPermission(async (request: NextRequest) => {
  let body: { url?: string; events?: string; secret?: string; description?: string }
  try {
    body = await parseJsonBody(request)
  } catch {
    return fail('Geçersiz JSON', { status: 400 })
  }
  const url = (body?.url || '').trim()
  if (!url) return fail('url gerekli', { status: 400 })
  try {
    new URL(url)
  } catch {
    return fail('Geçerli bir URL girin', { status: 400 })
  }
  const db = getDatabase()
  const id = randomUUID()
  db.prepare(`
    INSERT INTO webhook_endpoints (id, url, events, secret, description, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(
    id,
    url,
    (body.events || '').trim() || null,
    (body.secret || '').trim() || null,
    (body.description || '').trim() || null
  )
  const row = db.prepare('SELECT id, url, events, description, active, created_at FROM webhook_endpoints WHERE id = ?').get(id) as WebhookRow
  return ok(row)
}, '/webhooks', 'edit')
