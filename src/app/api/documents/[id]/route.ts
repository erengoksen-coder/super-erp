import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { withAuth } from '@/lib/api/withAuth'
import fs from 'fs'
import path from 'path'

/** GET: Tek doküman metadata veya ?download=1 ile dosya indir */
export const GET = withAuth(async (request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  const id = (await context?.params)?.id
  if (!id) {
    return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  }

  const db = getDatabase()
  type DocRow = {
    id: string
    title: string
    category: string | null
    file_name: string
    file_path: string
    file_size: number | null
    mime_type: string | null
    related_type: string | null
    related_id: string | null
    created_by: string | null
    created_at: string
  }
  const row = db.prepare(`
    SELECT id, title, category, file_name, file_path, file_size, mime_type, related_type, related_id, created_by, created_at
    FROM documents WHERE id = ?
  `).get(id) as DocRow | undefined

  if (!row) {
    return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  if (searchParams.get('download') === '1') {
    if (!fs.existsSync(row.file_path)) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 })
    }
    const buf = fs.readFileSync(row.file_path)
    const mime = row.mime_type || 'application/octet-stream'
    const name = path.basename(row.file_name) || 'document'
    return new NextResponse(buf, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(name)}"`,
        'Content-Length': String(buf.length),
      },
    })
  }

  return NextResponse.json({
    id: row.id,
    title: row.title,
    category: row.category,
    file_name: row.file_name,
    file_size: row.file_size,
    mime_type: row.mime_type,
    related_type: row.related_type,
    related_id: row.related_id,
    created_by: row.created_by,
    created_at: row.created_at,
  })
})

/** DELETE: Doküman ve dosyayı sil */
export const DELETE = withAuth(async (_request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  const id = (await context?.params)?.id
  if (!id) {
    return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  }

  const db = getDatabase()
  const row = db.prepare('SELECT file_path FROM documents WHERE id = ?').get(id) as { file_path: string } | undefined
  if (!row) {
    return NextResponse.json({ error: 'Doküman bulunamadı' }, { status: 404 })
  }

  db.prepare('DELETE FROM documents WHERE id = ?').run(id)
  if (fs.existsSync(row.file_path)) {
    try {
      fs.unlinkSync(row.file_path)
    } catch (_) {}
  }

  return NextResponse.json({ success: true })
})
