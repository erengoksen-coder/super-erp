import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

type EmployeeRow = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  status: string | null
  created_at: string
  department_id: string | null
  department_name: string | null
  team_id: string | null
  team_name: string | null
  workplace_id: string | null
  workplace_name: string | null
  title: string | null
  start_date: string | null
  shift_template_id?: string | null
  shift_name?: string | null
}

// GET: Çalışanları listele (profil bilgileriyle)
export const GET = withAuth(async () => {
  try {
    const db = getDatabase()
    const employees = db.prepare(`
      SELECT
        e.id, e.full_name, e.email, e.phone, e.status, e.created_at,
        p.department_id, d.name as department_name,
        p.team_id, t.name as team_name,
        p.workplace_id, w.name as workplace_name,
        p.title, p.start_date,
        p.shift_template_id, s.name as shift_name
      FROM hr_employees e
      LEFT JOIN hr_employee_profiles p ON p.employee_id = e.id AND p.deleted_at IS NULL
      LEFT JOIN hr_departments d ON d.id = p.department_id AND d.deleted_at IS NULL
      LEFT JOIN hr_teams t ON t.id = p.team_id AND t.deleted_at IS NULL
      LEFT JOIN hr_workplaces w ON w.id = p.workplace_id AND w.deleted_at IS NULL
      LEFT JOIN hr_shift_templates s ON s.id = p.shift_template_id AND s.deleted_at IS NULL
      WHERE e.deleted_at IS NULL
      ORDER BY e.created_at DESC
    `).all() as EmployeeRow[]
    return NextResponse.json(employees)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Yeni çalışan oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const {
      full_name, email, phone, status,
      department_id, team_id, workplace_id, title, start_date, shift_template_id,
    } = body || {}

    if (!full_name || !String(full_name).trim()) {
      return NextResponse.json({ error: 'full_name gerekli' }, { status: 400 })
    }

    const db = getDatabase()
    const id = randomUUID()
    db.prepare(`
      INSERT INTO hr_employees
      (id, full_name, email, phone, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      id,
      String(full_name).trim(),
      email ? String(email).trim() : null,
      phone ? String(phone).trim() : null,
      status ? String(status).trim() : 'active'
    )

    if (department_id || team_id || workplace_id || title || start_date || shift_template_id) {
      const profileId = randomUUID()
      db.prepare(`
        INSERT INTO hr_employee_profiles
        (id, employee_id, department_id, team_id, workplace_id, title, start_date, shift_template_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        profileId,
        id,
        department_id && String(department_id).trim() ? String(department_id).trim() : null,
        team_id && String(team_id).trim() ? String(team_id).trim() : null,
        workplace_id && String(workplace_id).trim() ? String(workplace_id).trim() : null,
        title ? String(title).trim() : null,
        start_date ? String(start_date).trim() : null,
        shift_template_id && String(shift_template_id).trim() ? String(shift_template_id).trim() : null
      )
    }

    return NextResponse.json({ id }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
