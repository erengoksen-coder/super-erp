import { NextResponse } from 'next/server'
import { db } from '@/lib/database/db'

export async function POST(request: Request) {
  try {
    const { month, year } = await request.json()
    
    // Get all active employees
    const employees = db.prepare('SELECT id, first_name, last_name, salary FROM hr_employees WHERE status = "active"').all() as any[]
    
    const results = []

    for (const emp of employees) {
      // Get attendance records for the month
      const attendance = db.prepare(`
        SELECT status, check_in, check_out 
        FROM hr_attendance 
        WHERE employee_id = ? AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
      `).all(emp.id, month, year) as any[]

      let totalDaysPresent = 0
      let totalOvertimeHours = 0
      let absenteeismDeductionDays = 0
      let earlyExitDeductionHours = 0

      attendance.forEach(record => {
        if (record.status === 'present') {
          totalDaysPresent++
          
          if (record.check_in && record.check_out) {
            // Early exit deduction (before 18:00)
            const [outH, outM] = record.check_out.split(':').map(Number)
            if (outH < 18) {
              earlyExitDeductionHours += (18 - outH) - (outM / 60)
            }

            // Overtime calculation (after 18:00)
            if (outH >= 18) {
               let otMinutes = (outH - 18) * 60 + outM
               if (otMinutes >= 30) {
                 otMinutes -= 30 // Deduct 30 min meal break
                 totalOvertimeHours += (otMinutes / 60) * 1.5 // 1.5x rate
               }
            }
          }
        } else if (record.status === 'absent') {
          absenteeismDeductionDays += 2 // 1 day absent + 1 day penalty
        }
      })

      const dailySalary = (emp.salary || 0) / 30
      const hourlySalary = dailySalary / 10 // 10 hour work day (08:00-18:00)

      const earnings = (totalDaysPresent * dailySalary) + (totalOvertimeHours * hourlySalary)
      const deductions = (absenteeismDeductionDays * dailySalary) + (earlyExitDeductionHours * hourlySalary)
      const finalSalary = Math.max(0, earnings - deductions)

      results.push({
        employee_id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        base_salary: emp.salary,
        total_days: totalDaysPresent,
        overtime_hours: totalOvertimeHours,
        deductions: deductions,
        final_salary: Math.round(finalSalary)
      })
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Payroll generation error:', error)
    return NextResponse.json({ error: 'Bordro oluşturulurken hata oluştu' }, { status: 500 })
  }
}
