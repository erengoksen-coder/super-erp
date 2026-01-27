import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'
import { createHash } from 'crypto'
import { randomUUID } from 'crypto'

function normalizeRoleName(role: unknown): string {
  const raw = String(role || '').trim().toLowerCase()
  if (raw === 'admin' || raw === 'yönetici' || raw === 'yonetici') return 'admin'
  if (!raw) return 'user'
  return raw
}

function getRoleId(roleName: string): string {
  if (roleName === 'admin') return 'role_admin'
  if (roleName === 'user') return 'role_user'
  return `role_${roleName.replace(/[^a-z0-9_]+/g, '_')}`
}

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
        u.position,
        u.job_title,
        u.is_approved,
        u.approved_by,
        u.approved_at,
        u.created_at,
        u.last_login,
        a.full_name as approved_by_name
      FROM users u
      LEFT JOIN users a ON u.approved_by = a.id
      WHERE u.company_id = ? AND u.branch_id = ?
      ORDER BY u.created_at DESC
    `).all(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

    // Her kullanıcı için izinleri getir
    const usersWithPermissions = users.map((user: any) => {
      const permissions = db.prepare(`
        SELECT page_path, can_view, can_create, can_edit, can_delete
        FROM user_permissions
        WHERE user_id = ? AND company_id = ? AND branch_id = ?
      `).all(user.id, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

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
    const { username, email, password, full_name, job_title, role, position, is_approved, permissions } = body

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
      const roleName = normalizeRoleName(role)
      const roleId = getRoleId(roleName)

      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, full_name, role, position, job_title, is_approved, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        username,
        email || null,
        passwordHash,
        full_name || null,
        roleName,
        position || null,
        job_title || null,
        is_approved ? 1 : 0,
        DEFAULT_COMPANY_ID,
        DEFAULT_BRANCH_ID
      )

      db.prepare(`
        INSERT OR IGNORE INTO roles (id, name, description, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(roleId, roleName, null, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

      db.prepare(`
        INSERT OR IGNORE INTO user_roles (id, user_id, role_id, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(`ur_${userId}_${roleId}`, userId, roleId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

      // İzinleri ekle
      if (permissions && Array.isArray(permissions)) {
        for (const perm of permissions) {
          if (perm.page_path) {
            const permId = randomUUID()
            db.prepare(`
              INSERT INTO user_permissions (id, user_id, page_path, can_view, can_create, can_edit, can_delete, company_id, branch_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              permId,
              userId,
              perm.page_path,
              perm.can_view ? 1 : 0,
              perm.can_create ? 1 : 0,
              perm.can_edit ? 1 : 0,
              perm.can_delete ? 1 : 0,
              DEFAULT_COMPANY_ID,
              DEFAULT_BRANCH_ID
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
        role: normalizeRoleName(role),
        job_title,
        is_approved: is_approved ? 1 : 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
