import { NextResponse } from 'next/server'
import { db } from '@/lib/database/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  try {
    const attendance = db.prepare(`
      SELECT 
        e.id as employee_id,
        e.first_name,
        e.last_name,
        e.department,
        a.id,
        a.date,
        a.status,
        a.check_in,
        a.check_out,
        a.notes
      FROM hr_employees e
      LEFT JOIN hr_attendance a ON e.id = a.employee_id AND a.date = ?
      WHERE e.status = 'active'
      ORDER BY e.first_name ASC
    `).all(date)

    // Normalize empty records
    const normalized = (attendance as any).map((r: any) => ({
      ...r,
      id: r.id || `temp-${r.employee_id}`,
      status: r.status || 'present',
      date: r.date || date,
      check_in: r.check_in || '08:00',
      check_out: r.check_out || '18:00'
    }))

    return NextResponse.json(normalized)
  } catch (error) {
    console.error('Attendance GET error:', error)
    return NextResponse.json({ error: 'Ölçeklenirken hata oluştu' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { date, records } = body

    if (!date || !records) {
      return NextResponse.json({ error: 'Eksik veri' }, { status: 400 })
    }

    const upsert = db.prepare(`
      INSERT INTO hr_attendance (employee_id, date, status, check_in, check_out, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(employee_id, date) DO UPDATE SET
        status = excluded.status,
        check_in = excluded.check_in,
        check_out = excluded.check_out,
        notes = excluded.notes
    `)

    const transaction = db.transaction((data) => {
      for (const record of data) {
        upsert.run(
          record.employee_id,
          date,
          record.status,
          record.check_in,
          record.check_out,
          record.notes
        )
      }
    })

    transaction(records)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Attendance POST error:', error)
    return NextResponse.json({ error: 'Kayıt sırasında hata oluştu' }, { status: 500 })
  }
}
