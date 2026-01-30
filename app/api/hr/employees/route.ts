import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

type EmployeeInput = {
  full_name?: string
  email?: string | null
  phone?: string | null
  status?: string | null
  department_id?: string | null
  team_id?: string | null
  workplace_id?: string | null
  title?: string | null
  employment_type?: string | null
  start_date?: string | null
  end_date?: string | null
  manager_id?: string | null
  base_salary?: number | null
  salary_currency?: string | null
  payroll_type?: string | null
  bank_iban?: string | null
  national_id?: string | null
  birth_date?: string | null
  address?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  annual_leave_days?: number | null
  contracts?: Array<{
    contract_type?: string | null
    start_date?: string | null
    end_date?: string | null
    work_hours_per_week?: number | null
    probation_end_date?: string | null
    status?: string | null
  }>
  compensation?: Array<{
    effective_from?: string | null
    effective_to?: string | null
    base_salary?: number | null
    salary_currency?: string | null
    bonus?: number | null
    allowance?: number | null
    notes?: string | null
  }>
  custom_fields?: Array<{
    field_key?: string
    field_value?: string | null
  }>
}

// GET: Çalışan listesi
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === '1'
    const db = getDatabase()
    const employees = db.prepare(`
      SELECT e.*,
        p.department_id, p.team_id, p.workplace_id,
        p.title, p.employment_type, p.start_date, p.end_date, p.manager_id,
        p.base_salary, p.salary_currency, p.payroll_type,
        p.bank_iban, p.national_id, p.birth_date, p.address,
        p.emergency_contact_name, p.emergency_contact_phone, p.annual_leave_days
      FROM hr_employees e
      LEFT JOIN hr_employee_profiles p ON p.employee_id = e.id AND p.deleted_at IS NULL
      WHERE e.deleted_at IS NULL
        AND (${includeInactive ? 1 : 0} = 1 OR e.status = 'active')
      ORDER BY e.full_name
    `).all() as Array<{ id: string }>

    if (employees.length === 0) {
      return NextResponse.json({ employees: [] })
    }

    const ids = employees.map((e) => e.id)
    const placeholders = ids.map(() => '?').join(',')
    const contracts = db.prepare(`
      SELECT * FROM hr_contracts
      WHERE deleted_at IS NULL AND employee_id IN (${placeholders})
      ORDER BY start_date DESC
    `).all(...ids) as Array<{ employee_id: string }>
    const compensation = db.prepare(`
      SELECT * FROM hr_compensation
      WHERE deleted_at IS NULL AND employee_id IN (${placeholders})
      ORDER BY effective_from DESC
    `).all(...ids) as Array<{ employee_id: string }>
    const customFields = db.prepare(`
      SELECT employee_id, field_key, field_value
      FROM hr_custom_fields
      WHERE deleted_at IS NULL AND employee_id IN (${placeholders})
      ORDER BY field_key
    `).all(...ids) as Array<{ employee_id: string }>

    const byEmployee = <T extends { employee_id: string }>(rows: T[]) => {
      const map = new Map<string, T[]>()
      for (const row of rows) {
        const bucket = map.get(row.employee_id) || []
        bucket.push(row)
        map.set(row.employee_id, bucket)
      }
      return map
    }
    const contractsByEmployee = byEmployee(contracts)
    const compensationByEmployee = byEmployee(compensation)
    const fieldsByEmployee = byEmployee(customFields)

    const enriched = employees.map((employee) => ({
      ...employee,
      contracts: contractsByEmployee.get(employee.id) || [],
      compensation: compensationByEmployee.get(employee.id) || [],
      custom_fields: fieldsByEmployee.get(employee.id) || [],
    }))

    return NextResponse.json({ employees: enriched })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Çalışan oluştur
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json() as EmployeeInput
    if (!body.full_name || !body.full_name.trim()) {
      return NextResponse.json({ error: 'full_name gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const employeeId = randomUUID()
    const profileId = randomUUID()
    db.transaction(() => {
      db.prepare(`
        INSERT INTO hr_employees
        (id, full_name, email, phone, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        employeeId,
        body.full_name.trim(),
        body.email ?? null,
        body.phone ?? null,
        body.status ?? 'active'
      )
      db.prepare(`
        INSERT INTO hr_employee_profiles
        (id, employee_id, department_id, team_id, workplace_id, title, employment_type,
         start_date, end_date, manager_id, base_salary, salary_currency, payroll_type,
         bank_iban, national_id, birth_date, address, emergency_contact_name, emergency_contact_phone,
         annual_leave_days, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        profileId,
        employeeId,
        body.department_id ?? null,
        body.team_id ?? null,
        body.workplace_id ?? null,
        body.title ?? null,
        body.employment_type ?? null,
        body.start_date ?? null,
        body.end_date ?? null,
        body.manager_id ?? null,
        body.base_salary ?? null,
        body.salary_currency ?? null,
        body.payroll_type ?? null,
        body.bank_iban ?? null,
        body.national_id ?? null,
        body.birth_date ?? null,
        body.address ?? null,
        body.emergency_contact_name ?? null,
        body.emergency_contact_phone ?? null,
        body.annual_leave_days ?? null
      )

      if (Array.isArray(body.contracts)) {
        const insertContract = db.prepare(`
          INSERT INTO hr_contracts
          (id, employee_id, contract_type, start_date, end_date, work_hours_per_week, probation_end_date, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        for (const contract of body.contracts) {
          insertContract.run(
            randomUUID(),
            employeeId,
            contract.contract_type ?? null,
            contract.start_date ?? null,
            contract.end_date ?? null,
            contract.work_hours_per_week ?? 45,
            contract.probation_end_date ?? null,
            contract.status ?? 'active'
          )
        }
      }

      if (Array.isArray(body.compensation)) {
        const insertComp = db.prepare(`
          INSERT INTO hr_compensation
          (id, employee_id, effective_from, effective_to, base_salary, salary_currency, bonus, allowance, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        for (const comp of body.compensation) {
          insertComp.run(
            randomUUID(),
            employeeId,
            comp.effective_from ?? null,
            comp.effective_to ?? null,
            comp.base_salary ?? null,
            comp.salary_currency ?? 'TRY',
            comp.bonus ?? 0,
            comp.allowance ?? 0,
            comp.notes ?? null
          )
        }
      }

      if (Array.isArray(body.custom_fields)) {
        const insertField = db.prepare(`
          INSERT INTO hr_custom_fields
          (id, employee_id, field_key, field_value, created_at, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        for (const field of body.custom_fields) {
          if (!field.field_key) continue
          insertField.run(randomUUID(), employeeId, field.field_key, field.field_value ?? null)
        }
      }
    })()
    return NextResponse.json({ id: employeeId }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// PATCH: Çalışan güncelle
export const PATCH = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json() as EmployeeInput & { id?: string }
    if (!body.id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    const existing = db.prepare('SELECT id FROM hr_employees WHERE id = ? AND deleted_at IS NULL').get(body.id) as { id: string } | undefined
    if (!existing) {
      return NextResponse.json({ error: 'Çalışan bulunamadı' }, { status: 404 })
    }
    db.transaction(() => {
      db.prepare(`
        UPDATE hr_employees
        SET full_name = COALESCE(?, full_name),
            email = COALESCE(?, email),
            phone = COALESCE(?, phone),
            status = COALESCE(?, status),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        body.full_name ?? null,
        body.email ?? null,
        body.phone ?? null,
        body.status ?? null,
        body.id
      )
      const profile = db.prepare('SELECT id FROM hr_employee_profiles WHERE employee_id = ? AND deleted_at IS NULL').get(body.id) as { id: string } | undefined
      if (profile) {
        db.prepare(`
          UPDATE hr_employee_profiles
          SET department_id = COALESCE(?, department_id),
              team_id = COALESCE(?, team_id),
              workplace_id = COALESCE(?, workplace_id),
              title = COALESCE(?, title),
              employment_type = COALESCE(?, employment_type),
              start_date = COALESCE(?, start_date),
              end_date = COALESCE(?, end_date),
              manager_id = COALESCE(?, manager_id),
              base_salary = COALESCE(?, base_salary),
              salary_currency = COALESCE(?, salary_currency),
              payroll_type = COALESCE(?, payroll_type),
              bank_iban = COALESCE(?, bank_iban),
              national_id = COALESCE(?, national_id),
              birth_date = COALESCE(?, birth_date),
              address = COALESCE(?, address),
              emergency_contact_name = COALESCE(?, emergency_contact_name),
              emergency_contact_phone = COALESCE(?, emergency_contact_phone),
              annual_leave_days = COALESCE(?, annual_leave_days),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          body.department_id ?? null,
          body.team_id ?? null,
          body.workplace_id ?? null,
          body.title ?? null,
          body.employment_type ?? null,
          body.start_date ?? null,
          body.end_date ?? null,
          body.manager_id ?? null,
          body.base_salary ?? null,
          body.salary_currency ?? null,
          body.payroll_type ?? null,
          body.bank_iban ?? null,
          body.national_id ?? null,
          body.birth_date ?? null,
          body.address ?? null,
          body.emergency_contact_name ?? null,
          body.emergency_contact_phone ?? null,
          body.annual_leave_days ?? null,
          profile.id
        )
      }

      if (Array.isArray(body.contracts)) {
        const insertContract = db.prepare(`
          INSERT INTO hr_contracts
          (id, employee_id, contract_type, start_date, end_date, work_hours_per_week, probation_end_date, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        for (const contract of body.contracts) {
          insertContract.run(
            randomUUID(),
            body.id,
            contract.contract_type ?? null,
            contract.start_date ?? null,
            contract.end_date ?? null,
            contract.work_hours_per_week ?? 45,
            contract.probation_end_date ?? null,
            contract.status ?? 'active'
          )
        }
      }

      if (Array.isArray(body.compensation)) {
        const insertComp = db.prepare(`
          INSERT INTO hr_compensation
          (id, employee_id, effective_from, effective_to, base_salary, salary_currency, bonus, allowance, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        for (const comp of body.compensation) {
          insertComp.run(
            randomUUID(),
            body.id,
            comp.effective_from ?? null,
            comp.effective_to ?? null,
            comp.base_salary ?? null,
            comp.salary_currency ?? 'TRY',
            comp.bonus ?? 0,
            comp.allowance ?? 0,
            comp.notes ?? null
          )
        }
      }

      if (Array.isArray(body.custom_fields)) {
        const upsertField = db.prepare(`
          INSERT INTO hr_custom_fields
          (id, employee_id, field_key, field_value, created_at, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(employee_id, field_key) DO UPDATE SET
            field_value = excluded.field_value,
            updated_at = CURRENT_TIMESTAMP,
            deleted_at = NULL
        `)
        for (const field of body.custom_fields) {
          if (!field.field_key) continue
          upsertField.run(randomUUID(), body.id, field.field_key, field.field_value ?? null)
        }
      }
    })()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// DELETE: Çalışan sil (soft delete)
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
    }
    const db = getDatabase()
    db.prepare(`UPDATE hr_employees SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`).run(id)
    db.prepare(`UPDATE hr_employee_profiles SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ? AND deleted_at IS NULL`).run(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
