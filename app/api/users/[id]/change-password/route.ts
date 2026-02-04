import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { z } from 'zod'
import { rateLimit } from '@/lib/api/rateLimit'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

type UserRow = {
  id: string
  password_hash: string
}

const changePasswordSchema = z.object({
  old_password: z.string().optional(),
  new_password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
  force_change: z.boolean().optional(),
})

// PATCH: Kullanıcı şifresini değiştir
export const PATCH = withAuth(async (
  request: NextRequest, user,
  context?: unknown
) => {
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id: string } | Promise<{ id: string }> } | undefined)?.params
    )
    if (!resolvedParams?.id) {
      return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
    }
    const userId = resolvedParams.id
    const limit = rateLimit(request, {
      keyPrefix: 'users:change-password',
      max: 10,
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

    let body: z.infer<typeof changePasswordSchema>
    try {
      body = await parseJsonBody(request, changePasswordSchema)
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Geçersiz istek' }, { status: 400 })
    }

    const { old_password, new_password, force_change } = body

    if (!force_change && !old_password) {
      return NextResponse.json(
        { error: 'Eski şifre gerekli' },
        { status: 400 }
      )
    }

    const db = getDatabase()

    // Kullanıcıyı bul
    const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(userId) as UserRow | undefined
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Eğer force_change değilse, eski şifreyi kontrol et
    if (!force_change && old_password) {
      if (!verifyPassword(old_password, user.password_hash)) {
        return NextResponse.json(
          { error: 'Eski şifre hatalı' },
          { status: 400 }
        )
      }
    }

    // Yeni şifreyi hashle ve güncelle
    const newPasswordHash = hashPassword(new_password)
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
})

