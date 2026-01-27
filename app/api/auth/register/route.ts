import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { createHash } from 'crypto'
import { randomUUID } from 'crypto'

// POST: Kullanıcı kaydı
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, password, full_name, job_title } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Kullanıcı adı ve şifre gerekli' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalıdır' },
        { status: 400 }
      )
    }

    if (!job_title) {
      return NextResponse.json(
        { error: 'Görev/Ünvan gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()
    const passwordHash = createHash('sha256').update(password).digest('hex')
    const userId = randomUUID()

    // Kullanıcı adı kontrolü
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as any
    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu kullanıcı adı zaten kullanılıyor' },
        { status: 400 }
      )
    }

    // E-posta kontrolü (varsa)
    if (email) {
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Bu e-posta adresi zaten kullanılıyor' },
          { status: 400 }
        )
      }
    }

    // Kullanıcı oluştur (onay bekliyor)
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, full_name, role, job_title, is_approved)
      VALUES (?, ?, ?, ?, ?, 'user', ?, 0)
    `).run(userId, username, email || null, passwordHash, full_name || null, job_title)

    return NextResponse.json({
      success: true,
      message: 'Kayıt başarılı! Admin onayı bekleniyor.',
      user: {
        id: userId,
        username,
        email,
        full_name,
        job_title,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


