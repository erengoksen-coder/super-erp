import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { createHash } from 'crypto'
import { randomUUID } from 'crypto'

// POST: Kullanıcı girişi
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Kullanıcı adı ve şifre gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    const passwordHash = createHash('sha256').update(password).digest('hex')

    // Kullanıcıyı bul
    const user = db.prepare(`
      SELECT id, username, email, full_name, role, is_approved, job_title
      FROM users
      WHERE username = ? AND password_hash = ?
    `).get(username, passwordHash) as any

    if (!user) {
      return NextResponse.json(
        { error: 'Kullanıcı adı veya şifre hatalı' },
        { status: 401 }
      )
    }

    // Onay kontrolü
    if (!user.is_approved) {
      return NextResponse.json(
        { error: 'Hesabınız henüz onaylanmamış. Lütfen admin onayı bekleyin.' },
        { status: 403 }
      )
    }

    // Son giriş zamanını güncelle
    db.prepare(`
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(user.id)

    // Basit token oluştur (gerçek uygulamada JWT kullanılmalı)
    const token = randomUUID()

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        job_title: user.job_title,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

