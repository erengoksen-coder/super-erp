import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { createHash } from 'crypto'

// PATCH: Kullanıcı şifresini değiştir
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const userId = resolvedParams.id
    const body = await request.json()
    const { old_password, new_password, force_change } = body

    if (!new_password) {
      return NextResponse.json(
        { error: 'Yeni şifre gerekli' },
        { status: 400 }
      )
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalıdır' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Kullanıcıyı bul
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Eğer force_change değilse, eski şifreyi kontrol et
    if (!force_change && old_password) {
      const oldPasswordHash = createHash('sha256').update(old_password).digest('hex')
      if (user.password_hash !== oldPasswordHash) {
        return NextResponse.json(
          { error: 'Eski şifre hatalı' },
          { status: 400 }
        )
      }
    }

    // Yeni şifreyi hashle ve güncelle
    const newPasswordHash = createHash('sha256').update(new_password).digest('hex')
    db.prepare(`
      UPDATE users 
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newPasswordHash, userId)

    return NextResponse.json({
      success: true,
      message: 'Şifre başarıyla değiştirildi',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

