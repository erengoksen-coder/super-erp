import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'

// Basit kesinti oranları (örnek; gerçek uygulamada dilim/brüt üst sınır kullanılır)
const SGK_WORKER_RATE = 0.14
const INCOME_TAX_RATE = 0.15
const STAMP_TAX_RATE = 0.00759

// GET: Bordro listesi (yıl, ay, employee_id ile filtre)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    const db = getDatabase()
    let query = `
      SELECT p.*, e.full_name as employee_name
      FROM hr_payrolls p
      JOIN hr_employees e ON e.id = p.employee_id AND e.deleted_at IS NULL
      WHERE p.deleted_at IS NULL
    `
    const params: (string | number)[] = []
    if (employeeId) {
      query += ' AND p.employee_id = ?'
      params.push(employeeId)
    }
    if (year) {
      query += " AND (strftime('%Y', p.period_start) = ? OR strftime('%Y', p.period_end) = ?)"
      params.push(year, year)
    }
    if (month) {
      query += " AND strftime('%m', p.period_start) = ?"
      params.push(month.padStart(2, '0'))
    }
    query += ' ORDER BY p.period_start DESC, e.full_name'

    const rows = db.prepare(query).all(...params)
    return NextResponse.json(rows)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})

// POST: Dönem için bordro hesapla (tüm aktif çalışanlar için draft oluşturur)
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}))
    const year = body?.year ?? new Date().getFullYear()
    const month = body?.month ?? new Date().getMonth() + 1
    const y = parseInt(String(year), 10)
    const m = Math.max(1, Math.min(12, parseInt(String(month), 10)))
    const periodStart = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0)
    const periodEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

    const db = getDatabase()
    const existing = db.prepare(
      'SELECT COUNT(*) as c FROM hr_payrolls WHERE period_start = ? AND deleted_at IS NULL'
    ).get(periodStart) as { c: number }
    if (existing && existing.c > 0) {
      return NextResponse.json(
        { error: `Bu dönem için zaten bordro kaydı var (${periodStart})` },
        { status: 400 }
      )
    }

    const employees = db.prepare(`
      SELECT e.id, e.full_name, p.base_salary
      FROM hr_employees e
      LEFT JOIN hr_employee_profiles p ON p.employee_id = e.id AND p.deleted_at IS NULL
      WHERE e.deleted_at IS NULL AND e.status = 'active'
    `).all() as { id: string; full_name: string; base_salary: number | null }[]

    const insertPayroll = db.prepare(`
      INSERT INTO hr_payrolls
      (id, employee_id, period_start, period_end, base_gross, gross_earnings, total_deductions, net_pay, currency, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'TRY', 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `)
    const insertItem = db.prepare(`
      INSERT INTO hr_payroll_items (id, payroll_id, type, code, description, amount, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `)

    const created: string[] = []
    const overtimeRows = db.prepare(`
      SELECT employee_id, SUM(overtime_minutes) as total_overtime
      FROM hr_attendance
      WHERE date >= ? AND date <= ? AND deleted_at IS NULL AND overtime_minutes > 0
      GROUP BY employee_id
    `).all(periodStart, periodEnd) as { employee_id: string; total_overtime: number }[]

    const overtimeByEmp = new Map(overtimeRows.map((r) => [r.employee_id, r.total_overtime || 0]))

    for (const emp of employees) {
      const grossBase = Number(emp.base_salary) || 0
      if (grossBase <= 0) continue

      const overtimeMinutes = overtimeByEmp.get(emp.id) || 0
      const monthlyHours = 225
      const overtimeMultiplier = 1.5
      const overtimePay = Math.round((overtimeMinutes / 60) * (grossBase / monthlyHours) * overtimeMultiplier * 100) / 100
      const gross = Math.round((grossBase + overtimePay) * 100) / 100

      const sgkWorker = Math.round(gross * SGK_WORKER_RATE * 100) / 100
      const incomeTax = Math.round(gross * INCOME_TAX_RATE * 100) / 100
      const stampTax = Math.round(gross * STAMP_TAX_RATE * 100) / 100
      const totalDeductions = sgkWorker + incomeTax + stampTax
      const netPay = Math.round((gross - totalDeductions) * 100) / 100

      const payrollId = randomUUID()
      insertPayroll.run(payrollId, emp.id, periodStart, periodEnd, grossBase, gross, totalDeductions, netPay)
      created.push(payrollId)

      insertItem.run(randomUUID(), payrollId, 'earning', 'brut', 'Brüt maaş', grossBase)
      if (overtimePay > 0) {
        insertItem.run(randomUUID(), payrollId, 'earning', 'overtime', 'Fazla mesai', overtimePay)
      }
      insertItem.run(randomUUID(), payrollId, 'deduction', 'sgk', 'SGK işçi payı', -sgkWorker)
      insertItem.run(randomUUID(), payrollId, 'deduction', 'income_tax', 'Gelir vergisi', -incomeTax)
      insertItem.run(randomUUID(), payrollId, 'deduction', 'stamp', 'Damga vergisi', -stampTax)
    }

    return NextResponse.json({
      period_start: periodStart,
      period_end: periodEnd,
      count: created.length,
      payroll_ids: created,
    }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
