import { NextResponse } from 'next/server'
import { db } from '@/lib/database/db'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM hr_employees WHERE status = 'active') as total_employees,
        (SELECT COUNT(*) FROM hr_attendance WHERE date = ? AND status = 'present') as present_today,
        (SELECT COUNT(*) FROM hr_attendance WHERE date = ? AND status = 'absent') as absent_today,
        (SELECT COUNT(*) FROM hr_leave WHERE ? BETWEEN start_date AND end_date AND status = 'approved') as on_leave
    `).get(today, today, today) as any

    const upcomingBirthdays = db.prepare(`
      SELECT first_name, last_name, birth_date 
      FROM hr_employees 
      WHERE strftime('%m-%d', birth_date) >= strftime('%m-%d', 'now')
      ORDER BY strftime('%m-%d', birth_date) ASC
      LIMIT 5
    `).all()

    return NextResponse.json({
      stats,
      upcomingBirthdays
    })
  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json({ error: 'Veri çekilemedi' }, { status: 500 })
  }
}
