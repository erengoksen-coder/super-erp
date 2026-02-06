import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// GET: Adaylar (job_opening_id ile filtre)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_opening_id')
    const db = getDatabase()
    let query = `
      SELECT c.*, o.title as job_title
      FROM hr_job_candidates c
      JOIN hr_job_openings o ON o.id = c.job_opening_id AND o.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
    `
    const params: string[] = []
    if (jobId) {
      query += ' AND c.job_opening_id = ?'
      params.push(jobId)
    }
    query += ' ORDER BY c.created_at DESC'
    const rows = db.prepare(query).all(...params)
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Yeni aday
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { job_opening_id, full_name, email, phone, notes } = body || {}
    if (!job_opening_id || !full_name || !String(full_name).trim()) {
      return NextResponse.json({ error: 'job_opening_id ve full_name gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO hr_job_candidates (id, job_opening_id, full_name, email, phone, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'applied', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      job_opening_id,
      String(full_name).trim(),
      email ? String(email).trim() : null,
      phone ? String(phone).trim() : null,
      notes ? String(notes).trim() : null
    )
    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
