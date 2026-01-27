import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

// PATCH: Kullanıcı durumunu güncelle (onaylama/reddetme)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id
    const body = await request.json()
    const { status, approved_by } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Durum belirtilmelidir' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Kullanıcıyı bul
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Durum değerlerini kontrol et ve is_approved'a çevir
    let isApproved = 0
    if (status === 'active' || status === 'approved' || status === true) {
      isApproved = 1
    } else if (status === 'pending' || status === 'rejected' || status === false) {
      isApproved = 0
    } else {
      return NextResponse.json(
        { error: 'Geçersiz durum değeri. Geçerli değerler: active, approved, pending, rejected' },
        { status: 400 }
      )
    }

    // Kullanıcı durumunu güncelle
    if (isApproved === 1 && approved_by) {
      db.prepare(`
        UPDATE users 
        SET is_approved = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(isApproved, approved_by, userId)
    } else {
      db.prepare(`
        UPDATE users 
        SET is_approved = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(isApproved, userId)
    }

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı durumu başarıyla güncellendi',
      is_approved: isApproved,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

