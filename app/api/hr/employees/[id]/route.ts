import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const db = getDatabase()
    const employee = db.prepare('SELECT * FROM hr_employees WHERE id = ?').get(params.id)
    if (!employee) return NextResponse.json({ error: 'Personel bulunamadı' }, { status: 404 })
    return NextResponse.json(employee)
  } catch (error) {
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const db = getDatabase()
    db.prepare('DELETE FROM hr_employees WHERE id = ?').run(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Silme hatası' }, { status: 500 })
  }
}
