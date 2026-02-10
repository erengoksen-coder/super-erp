import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { apiLogger } from '@/lib/api/logger'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'
import { hashPassword } from '@/lib/auth/password'
import { randomUUID } from 'crypto'
import { logAudit } from '@/lib/audit'
import { getAuthUserId } from '@/lib/auth/session'

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

async function getActorId(request: NextRequest) {
  return await getAuthUserId(request)
}

// GET: Tüm kullanıcıları getir (sadece admin)
export const GET = withAuth(async (request: NextRequest) => {
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
        COALESCE(u.is_locked, 0) as is_locked,
        u.approved_by,
        u.approved_at,
        u.created_at,
        u.last_login,
        u.last_activity,
        u.dealer_name,
        a.full_name as approved_by_name
      FROM users u
      LEFT JOIN users a ON u.approved_by = a.id
      WHERE u.company_id = ? AND u.branch_id = ?
        AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `).all(DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

    const ONLINE_THRESHOLD_MS = 60 * 60 * 1000 // 1 saat (heartbeat ile güncellenir)

    // SQLite CURRENT_TIMESTAMP UTC; JS'de UTC olarak oku (yerel saat yanlış çevrimdışı gösterebilir)
    function parseActivityMs(val: string | null | undefined): number {
      if (!val) return 0
      const s = String(val).trim()
      if (!s) return 0
      const asUtc = s.length === 19 && s.includes(' ') && !s.endsWith('Z')
        ? s.replace(' ', 'T') + 'Z'
        : s
      const ms = new Date(asUtc).getTime()
      return Number.isFinite(ms) ? ms : 0
    }

    // Her kullanıcı için izinleri ve çevrimiçi bilgisini ekle
    const usersWithPermissions = users.map((user: any) => {
      const permissions = db.prepare(`
        SELECT page_path, can_view, can_create, can_edit, can_delete
        FROM user_permissions
        WHERE user_id = ? AND company_id = ? AND branch_id = ?
      `).all(user.id, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

      const activityMs = parseActivityMs(user.last_activity || user.last_login)
      const is_online = activityMs > 0 && Date.now() - activityMs < ONLINE_THRESHOLD_MS

      return {
        ...user,
        permissions,
        is_online,
      }
    })

    return NextResponse.json(usersWithPermissions)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Users API GET failed'
    apiLogger.error('Users API GET failed', { message, path: request.nextUrl.pathname })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}, ['admin'])

// POST: Yeni kullanıcı oluştur (admin)
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await parseJsonBody(request)
    const { username, email, password, full_name, job_title, role, position, is_approved, permissions, dealer_name } = body

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
    const passwordHash = hashPassword(password)
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
        INSERT INTO users (id, username, email, password_hash, full_name, role, position, job_title, is_approved, company_id, branch_id, dealer_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        DEFAULT_BRANCH_ID,
        (dealer_name != null && String(dealer_name).trim() !== '') ? String(dealer_name).trim() : null
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

    logAudit(db, {
      tableName: 'users',
      action: 'create',
      recordId: userId,
      userId: await getActorId(request),
      after: {
        id: userId,
        username,
        role: normalizeRoleName(role),
        is_approved: is_approved ? 1 : 0,
      },
    })

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Users API POST failed'
    apiLogger.error('Users API POST failed', { message, path: request.nextUrl.pathname })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}, ['admin'])

