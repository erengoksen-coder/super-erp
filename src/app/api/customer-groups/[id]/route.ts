import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

// GET: Grup detay
export const GET = withAuth(async (request: NextRequest, _user: any, context?: any) => {
  try {
    const resolvedParams = await (context as any)?.params
    const id = resolvedParams?.id
    if (!id) return fail('ID gerekli', { status: 400 })
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM customer_groups WHERE id = ? AND deleted_at IS NULL').get(id) as any
    if (!row) return fail('Grup bulunamadı', { status: 404 })
    return ok(row)
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

// PATCH: Güncelle
export const PATCH = withAuth(async (request: NextRequest, _user: any, context?: any) => {
  try {
    const resolvedParams = await (context as any)?.params
    const id = resolvedParams?.id
    if (!id) return fail('ID gerekli', { status: 400 })
    const body = await request.json().catch(() => ({}))
    const db = getDatabase()
    const existing = db.prepare('SELECT id FROM customer_groups WHERE id = ? AND deleted_at IS NULL').get(id)
    if (!existing) return fail('Grup bulunamadı', { status: 404 })
    const updates: string[] = ['updated_at = ?']
    const params: any[] = [new Date().toISOString()]
    if (body.name !== undefined) { updates.push('name = ?'); params.push(String(body.name).trim()) }
    if (body.code !== undefined) { updates.push('code = ?'); params.push(body.code?.trim() || null) }
    if (body.description !== undefined) { updates.push('description = ?'); params.push(body.description?.trim() || null) }
    params.push(id)
    db.prepare(`UPDATE customer_groups SET ${updates.join(', ')} WHERE id = ?`).run(...params)
    return ok({ success: true })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})

// DELETE: Soft delete
export const DELETE = withAuth(async (request: NextRequest, _user: any, context?: any) => {
  try {
    const resolvedParams = await (context as any)?.params
    const id = resolvedParams?.id
    if (!id) return fail('ID gerekli', { status: 400 })
    const db = getDatabase()
    const now = new Date().toISOString()
    const result = db.prepare('UPDATE customer_groups SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id)
    if (result.changes === 0) return fail('Grup bulunamadı', { status: 404 })
    return ok({ success: true })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
})
