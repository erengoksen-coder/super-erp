import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

export async function GET() {
  try {
    const db = getDatabase()
    const employees = db.prepare('SELECT * FROM hr_employees WHERE status = "active" ORDER BY first_name ASC').all()
    return NextResponse.json(employees)
  } catch (error) {
    return NextResponse.json({ error: 'Listeleme hatası' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const db = getDatabase()
    const body = await request.json()
    const result = db.prepare(`
      INSERT INTO hr_employees (id, first_name, last_name, email, phone, department, title, hire_date, salary, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      crypto.randomUUID(),
      body.first_name,
      body.last_name,
      body.email,
      body.phone,
      body.department,
      body.title,
      body.hire_date,
      body.salary
    )
    return NextResponse.json({ id: result.lastInsertRowid })
  } catch (error) {
    return NextResponse.json({ error: 'Kayıt hatası' }, { status: 500 })
  }
}
