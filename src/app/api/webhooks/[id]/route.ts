import { NextRequest } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { withAuthAndPermission } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { parseJsonBody } from '@/lib/api/validate'

// PATCH: Webhook güncelle (active, url, events, description)
export const PATCH = withAuthAndPermission(async (request: NextRequest, _user, context?: { params?: Promise<{ id: string }> | { id: string } }) => {
  const resolvedParams = await Promise.resolve((context as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params)
  const id = resolvedParams?.id
  if (!id) return fail('ID gerekli', { status: 400 })
  let body: { url?: string; events?: string; secret?: string; description?: string; active?: boolean }
  try {
    body = await parseJsonBody(request)
  } catch {
    return fail('Geçersiz JSON', { status: 400 })
  }
  const db = getDatabase()
  const existing = db.prepare('SELECT id FROM webhook_endpoints WHERE id = ?').get(id)
  if (!existing) return fail('Webhook bulunamadı', { status: 404 })
  if (body.url !== undefined) {
    const url = String(body.url).trim()
    if (!url) return fail('url boş olamaz', { status: 400 })
    try {
      new URL(url)
    } catch {
      return fail('Geçerli bir URL girin', { status: 400 })
    }
    db.prepare('UPDATE webhook_endpoints SET url = ? WHERE id = ?').run(url, id)
  }
  if (body.events !== undefined) db.prepare('UPDATE webhook_endpoints SET events = ? WHERE id = ?').run((body.events || '').trim() || null, id)
  if (body.secret !== undefined) db.prepare('UPDATE webhook_endpoints SET secret = ? WHERE id = ?').run((body.secret || '').trim() || null, id)
  if (body.description !== undefined) db.prepare('UPDATE webhook_endpoints SET description = ? WHERE id = ?').run((body.description || '').trim() || null, id)
  if (body.active !== undefined) db.prepare('UPDATE webhook_endpoints SET active = ? WHERE id = ?').run(body.active ? 1 : 0, id)
  const row = db.prepare('SELECT id, url, events, description, active, created_at FROM webhook_endpoints WHERE id = ?').get(id)
  return ok(row)
}, '/webhooks', 'edit')

// DELETE: Webhook sil
export const DELETE = withAuthAndPermission(async (_request, _user, context?: { params?: Promise<{ id: string }> | { id: string } }) => {
  const resolvedParams = await Promise.resolve((context as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params)
  const id = resolvedParams?.id
  if (!id) return fail('ID gerekli', { status: 400 })
  const db = getDatabase()
  const r = db.prepare('DELETE FROM webhook_endpoints WHERE id = ?').run(id)
  if (r.changes === 0) return fail('Webhook bulunamadı', { status: 404 })
  return ok({ deleted: id })
}, '/webhooks', 'edit')
