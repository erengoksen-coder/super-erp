import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase } from '@/lib/database/db'

// GET: Çalışan detayı (profil ile)
export const GET = withAuth(async (_request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  try {
    const params = context?.params ? await context.params : undefined
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const row = db.prepare(`
      SELECT
        e.*,
        p.id as profile_id, p.department_id, p.team_id, p.workplace_id,
        p.title, p.start_date, p.employment_type, p.end_date, p.manager_id,
        p.base_salary, p.salary_currency, p.national_id, p.birth_date, p.address,
        p.emergency_contact_name, p.emergency_contact_phone, p.annual_leave_days,
        p.shift_template_id,
        d.name as department_name,
        t.name as team_name,
        w.name as workplace_name,
        s.name as shift_name
      FROM hr_employees e
      LEFT JOIN hr_employee_profiles p ON p.employee_id = e.id AND p.deleted_at IS NULL
      LEFT JOIN hr_departments d ON d.id = p.department_id AND d.deleted_at IS NULL
      LEFT JOIN hr_teams t ON t.id = p.team_id AND t.deleted_at IS NULL
      LEFT JOIN hr_workplaces w ON w.id = p.workplace_id AND w.deleted_at IS NULL
      LEFT JOIN hr_shift_templates s ON s.id = p.shift_template_id AND s.deleted_at IS NULL
      WHERE e.id = ? AND e.deleted_at IS NULL
    `).get(id) as any
    if (!row) {
      return NextResponse.json({ error: 'Çalışan bulunamadı' }, { status: 404 })
    }
    const employee = {
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      profile: {
        department_id: row.department_id,
        department_name: row.department_name,
        team_id: row.team_id,
        team_name: row.team_name,
        workplace_id: row.workplace_id,
        workplace_name: row.workplace_name,
        title: row.title,
        start_date: row.start_date,
        end_date: row.end_date,
        employment_type: row.employment_type,
        manager_id: row.manager_id,
        base_salary: row.base_salary,
        salary_currency: row.salary_currency,
        national_id: row.national_id,
        birth_date: row.birth_date,
        address: row.address,
        emergency_contact_name: row.emergency_contact_name,
        emergency_contact_phone: row.emergency_contact_phone,
        annual_leave_days: row.annual_leave_days,
        shift_template_id: row.shift_template_id,
        shift_name: row.shift_name,
      },
    }
    return NextResponse.json(employee)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// PATCH: Çalışan güncelle (profil dahil)
export const PATCH = withAuth(async (request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  try {
    const params = context?.params ? await context.params : undefined
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const body = await parseJsonBody(request)
    const {
      full_name, email, phone, status,
      department_id, team_id, workplace_id, title, start_date,
      employment_type, end_date, national_id, birth_date, address,
      emergency_contact_name, emergency_contact_phone, annual_leave_days, base_salary,
      shift_template_id,
    } = body || {}

    const db = getDatabase()
    const existing = db.prepare('SELECT id FROM hr_employees WHERE id = ? AND deleted_at IS NULL').get(id) as { id: string } | undefined
    if (!existing) {
      return NextResponse.json({ error: 'Çalışan bulunamadı' }, { status: 404 })
    }

    db.prepare(`
      UPDATE hr_employees
      SET full_name = COALESCE(?, full_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      full_name ? String(full_name).trim() : null,
      email ? String(email).trim() : null,
      phone ? String(phone).trim() : null,
      status ? String(status).trim() : null,
      id
    )

    const hasProfileFields = department_id !== undefined || team_id !== undefined || workplace_id !== undefined ||
      title !== undefined || start_date !== undefined || employment_type !== undefined || end_date !== undefined ||
      national_id !== undefined || birth_date !== undefined || address !== undefined ||
      emergency_contact_name !== undefined || emergency_contact_phone !== undefined || annual_leave_days !== undefined || base_salary !== undefined || shift_template_id !== undefined

    if (hasProfileFields) {
      const { randomUUID } = await import('crypto')
      const existingProfile = db.prepare('SELECT id FROM hr_employee_profiles WHERE employee_id = ? AND deleted_at IS NULL').get(id) as { id: string } | undefined
      if (existingProfile) {
        db.prepare(`
          UPDATE hr_employee_profiles
          SET department_id = COALESCE(?, department_id),
              team_id = COALESCE(?, team_id),
              workplace_id = COALESCE(?, workplace_id),
              title = COALESCE(?, title),
              start_date = COALESCE(?, start_date),
              employment_type = COALESCE(?, employment_type),
              end_date = COALESCE(?, end_date),
              national_id = COALESCE(?, national_id),
              birth_date = COALESCE(?, birth_date),
              address = COALESCE(?, address),
              emergency_contact_name = COALESCE(?, emergency_contact_name),
              emergency_contact_phone = COALESCE(?, emergency_contact_phone),
              annual_leave_days = COALESCE(?, annual_leave_days),
              base_salary = COALESCE(?, base_salary),
              shift_template_id = COALESCE(?, shift_template_id),
              updated_at = CURRENT_TIMESTAMP
          WHERE employee_id = ?
        `).run(
          department_id != null ? String(department_id).trim() || null : null,
          team_id != null ? String(team_id).trim() || null : null,
          workplace_id != null ? String(workplace_id).trim() || null : null,
          title != null ? String(title).trim() || null : null,
          start_date != null ? String(start_date).trim() || null : null,
          employment_type != null ? String(employment_type).trim() || null : null,
          end_date != null ? String(end_date).trim() || null : null,
          national_id != null ? String(national_id).trim() || null : null,
          birth_date != null ? String(birth_date).trim() || null : null,
          address != null ? String(address).trim() || null : null,
          emergency_contact_name != null ? String(emergency_contact_name).trim() || null : null,
          emergency_contact_phone != null ? String(emergency_contact_phone).trim() || null : null,
          annual_leave_days != null ? Number(annual_leave_days) : null,
          base_salary != null ? Number(base_salary) : null,
          shift_template_id != null ? String(shift_template_id).trim() || null : null,
          id
        )
      } else {
        const profileId = randomUUID()
        db.prepare(`
          INSERT INTO hr_employee_profiles
          (id, employee_id, department_id, team_id, workplace_id, title, start_date, employment_type, end_date,
           national_id, birth_date, address, emergency_contact_name, emergency_contact_phone, annual_leave_days, base_salary, shift_template_id,
           created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          profileId, id,
          department_id != null ? String(department_id).trim() || null : null,
          team_id != null ? String(team_id).trim() || null : null,
          workplace_id != null ? String(workplace_id).trim() || null : null,
          title != null ? String(title).trim() || null : null,
          start_date != null ? String(start_date).trim() || null : null,
          employment_type != null ? String(employment_type).trim() || null : null,
          end_date != null ? String(end_date).trim() || null : null,
          national_id != null ? String(national_id).trim() || null : null,
          birth_date != null ? String(birth_date).trim() || null : null,
          address != null ? String(address).trim() || null : null,
          emergency_contact_name != null ? String(emergency_contact_name).trim() || null : null,
          emergency_contact_phone != null ? String(emergency_contact_phone).trim() || null : null,
          annual_leave_days != null ? Number(annual_leave_days) : 14,
          base_salary != null ? Number(base_salary) : 0,
          shift_template_id != null ? String(shift_template_id).trim() || null : null
        )
      }
    }

    return NextResponse.json({ id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// DELETE: Çalışan sil (soft delete)
export const DELETE = withAuth(async (_request: NextRequest, _user, context?: { params?: Promise<{ id: string }> }) => {
  try {
    const params = context?.params ? await context.params : undefined
    const id = params?.id
    if (!id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    db.prepare(`
      UPDATE hr_employees
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(id)
    return NextResponse.json({ id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
