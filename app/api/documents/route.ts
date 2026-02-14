import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { withAuth } from '@/lib/api/withAuth'
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'documents')
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

/** GET: Liste; query: category, search, related_type, related_id */
export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || undefined
  const search = searchParams.get('search') || undefined
  const relatedType = searchParams.get('related_type') || undefined
  const relatedId = searchParams.get('related_id') || undefined

  const db = getDatabase()
  let sql = `
    SELECT id, title, category, file_name, file_size, mime_type, related_type, related_id, created_by, created_at
    FROM documents
    WHERE 1=1
  `
  const params: (string | undefined)[] = []
  if (category) {
    sql += ` AND category = ?`
    params.push(category)
  }
  if (search) {
    sql += ` AND (title LIKE ? OR file_name LIKE ?)`
    params.push(`%${search}%`, `%${search}%`)
  }
  if (relatedType) {
    sql += ` AND related_type = ?`
    params.push(relatedType)
  }
  if (relatedId) {
    sql += ` AND related_id = ?`
    params.push(relatedId)
  }
  sql += ` ORDER BY created_at DESC`

  const rows = db.prepare(sql).all(...params) as Array<{
    id: string
    title: string
    category: string | null
    file_name: string
    file_size: number | null
    mime_type: string | null
    related_type: string | null
    related_id: string | null
    created_by: string | null
    created_at: string
  }>
  return NextResponse.json(rows)
})

/** POST: Yükle (FormData: file, title, category?, related_type?, related_id?) */
export const POST = withAuth(async (request: NextRequest, user) => {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'FormData gerekli (file, title)' }, { status: 400 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'FormData ayrıştırılamadı' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const title = (formData.get('title') as string)?.trim()
  const category = (formData.get('category') as string)?.trim() || null
  const relatedType = (formData.get('related_type') as string)?.trim() || null
  const relatedId = (formData.get('related_id') as string)?.trim() || null

  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'Dosya gerekli' }, { status: 400 })
  }
  if (!title) {
    return NextResponse.json({ error: 'Başlık gerekli' }, { status: 400 })
  }

  const mime = file.type || 'application/octet-stream'
  if (ALLOWED_MIME.length && !ALLOWED_MIME.includes(mime)) {
    return NextResponse.json({ error: 'İzin verilen türler: PDF, JPEG, PNG, GIF, WebP' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Dosya en fazla 20 MB olabilir' }, { status: 400 })
  }

  ensureUploadDir()
  const id = randomUUID()
  const ext = path.extname(file.name) || (mime.includes('pdf') ? '.pdf' : '.bin')
  const safeName = `${id}${ext}`
  const filePath = path.join(UPLOAD_DIR, safeName)

  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(filePath, buffer)

  const db = getDatabase()
  db.prepare(`
    INSERT INTO documents (id, company_id, branch_id, title, category, file_name, file_path, file_size, mime_type, related_type, related_id, created_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    DEFAULT_COMPANY_ID,
    DEFAULT_BRANCH_ID,
    title,
    category,
    file.name,
    filePath,
    file.size,
    mime,
    relatedType,
    relatedId,
    user.userId,
    new Date().toISOString()
  )

  return NextResponse.json({
    id,
    title,
    category,
    file_name: file.name,
    file_size: file.size,
    mime_type: mime,
    related_type: relatedType,
    related_id: relatedId,
    created_at: new Date().toISOString(),
  })
})
