import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'
import { createHash } from 'crypto'
import { randomUUID } from 'crypto'

// GET: Tüm kullanıcıları getir (sadece admin)
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase()
    
    const users = db.prepare(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.role,
        u.job_title,
        u.is_approved,
        u.approved_by,
        u.approved_at,
        u.created_at,
        u.last_login,
        a.full_name as approved_by_name
      FROM users u
      LEFT JOIN users a ON u.approved_by = a.id
      ORDER BY u.created_at DESC
    `).all()

    // Her kullanıcı için izinleri getir
    const usersWithPermissions = users.map((user: any) => {
      const permissions = db.prepare(`
        SELECT page_path, can_view, can_create, can_edit, can_delete
        FROM user_permissions
        WHERE user_id = ?
      `).all(user.id)

      return {
        ...user,
        permissions,
      }
    })

    return NextResponse.json(usersWithPermissions)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Yeni kullanıcı oluştur (admin)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, password, full_name, job_title, role, is_approved, permissions } = body

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

    db.transaction(() => {
      // Kullanıcı oluştur
      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, full_name, role, job_title, is_approved)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        username,
        email || null,
        passwordHash,
        full_name || null,
        role || 'user',
        job_title || null,
        is_approved ? 1 : 0
      )

      // İzinleri ekle
      if (permissions && Array.isArray(permissions)) {
        for (const perm of permissions) {
          if (perm.page_path) {
            const permId = randomUUID()
            db.prepare(`
              INSERT INTO user_permissions (id, user_id, page_path, can_view, can_create, can_edit, can_delete)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              permId,
              userId,
              perm.page_path,
              perm.can_view ? 1 : 0,
              perm.can_create ? 1 : 0,
              perm.can_edit ? 1 : 0,
              perm.can_delete ? 1 : 0
            )
          }
        }
      }
    })()

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: {
        id: userId,
        username,
        email,
        full_name,
        role: role || 'user',
        job_title,
        is_approved: is_approved ? 1 : 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
