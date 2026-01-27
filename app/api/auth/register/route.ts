import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { rateLimit } from '@/lib/api/rateLimit'
import { hashPassword } from '@/lib/auth/password'
import { ok, fail } from '@/lib/api/response'

type UserIdRow = {
  id: string
}

const registerSchema = z.object({
  username: z.string().trim().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır'),
  email: z.string().trim().email('Geçerli bir e-posta adresi girin').optional().or(z.literal('')),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  full_name: z.string().trim().optional(),
  job_title: z.string().trim().min(1, 'Görev/Ünvan gerekli'),
})

// POST: Kullanıcı kaydı
export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(request, {
      keyPrefix: 'auth:register',
      max: 5,
      windowMs: 60_000,
    })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla deneme. Lütfen sonra tekrar deneyin.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((limit.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Geçersiz istek' },
        { status: 400 }
      )
    }
    const { username, email, password, full_name, job_title } = parsed.data

    const db = getDatabase()
    const passwordHash = hashPassword(password)
    const userId = randomUUID()

    // Kullanıcı adı kontrolü
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as UserIdRow | undefined
    if (existingUser) {
      return fail('Bu kullanıcı adı zaten kullanılıyor', { status: 400 })
    }

    // E-posta kontrolü (varsa)
    if (email) {
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as UserIdRow | undefined
      if (existingEmail) {
        return fail('Bu e-posta adresi zaten kullanılıyor', { status: 400 })
      }
    }

    // Kullanıcı oluştur (onay bekliyor)
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, full_name, role, job_title, is_approved)
      VALUES (?, ?, ?, ?, ?, 'user', ?, 0)
    `).run(userId, username, email || null, passwordHash, full_name || null, job_title)

    return ok(
      {
        user: {
          id: userId,
          username,
          email,
          full_name,
          job_title,
        },
      },
      { message: 'Kayıt başarılı! Admin onayı bekleniyor.' }
    )
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}


