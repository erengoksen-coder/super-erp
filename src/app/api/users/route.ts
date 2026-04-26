import { NextRequest } from 'next/server'
import { getDatabase, DEFAULT_COMPANY_ID } from '@/lib/database/db'
import { hashPassword } from '@/lib/auth/password'
import { randomUUID } from 'crypto'
import { logAudit } from '@/lib/audit'
import { apiHandler } from '@/lib/api/handler'
import { AppError } from '@/lib/errors'

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
export const GET = apiHandler(async (req, { user }) => {
  const db = getDatabase()
  const { companyId } = user!
  
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
    WHERE (u.company_id = ? OR u.company_id = ?) 
      AND u.deleted_at IS NULL
    ORDER BY u.created_at DESC
  `).all(companyId, DEFAULT_COMPANY_ID)

  const ONLINE_THRESHOLD_MS = 60 * 60 * 1000 

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

  return users.map((u: any) => {
    const permissions = db.prepare(`
      SELECT page_path, can_view, can_create, can_edit, can_delete
      FROM user_permissions
      WHERE user_id = ? AND (company_id = ? OR company_id = ?)
    `).all(u.id, companyId, DEFAULT_COMPANY_ID)

    const activityMs = parseActivityMs(u.last_activity || u.last_login)
    const is_online = activityMs > 0 && Date.now() - activityMs < ONLINE_THRESHOLD_MS

    return {
      ...u,
      permissions,
      is_online,
    }
  })
}, { roles: ['admin'] })

// POST: Yeni kullanıcı oluştur (admin)
export const POST = apiHandler(async (req, { user }) => {
  const body = await req.json()
  const { username, email, password, full_name, job_title, role, position, is_approved, permissions, dealer_name } = body
  const { companyId, branchId, userId: authUserId } = user!

  if (!username || !password) {
    throw new AppError('Kullanıcı adı ve şifre gerekli', 400)
  }

  if (password.length < 6) {
    throw new AppError('Şifre en az 6 karakter olmalıdır', 400)
  }

  const db = getDatabase()
  const passwordHash = hashPassword(password)
  const newUserId = randomUUID()

  const existingUser = db.prepare('SELECT id FROM users WHERE username = ? AND company_id = ? AND branch_id = ?').get(username, companyId, branchId) as any
  if (existingUser) {
    throw new AppError('Bu kullanıcı adı zaten kullanılıyor', 400)
  }

  db.transaction(() => {
    const roleName = normalizeRoleName(role)
    const roleId = getRoleId(roleName)

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, full_name, role, position, job_title, is_approved, company_id, branch_id, dealer_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newUserId,
      username,
      email || null,
      passwordHash,
      full_name || null,
      roleName,
      position || null,
      job_title || null,
      is_approved ? 1 : 0,
      companyId,
      branchId,
      (dealer_name != null && String(dealer_name).trim() !== '') ? String(dealer_name).trim() : null
    )

    db.prepare(`
      INSERT OR IGNORE INTO roles (id, name, description, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(roleId, roleName, null, companyId, branchId)

    db.prepare(`
      INSERT OR IGNORE INTO user_roles (id, user_id, role_id, company_id, branch_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(`ur_${newUserId}_${roleId}`, newUserId, roleId, companyId, branchId)

    if (permissions && Array.isArray(permissions)) {
      for (const perm of permissions) {
        if (perm.page_path) {
          db.prepare(`
            INSERT INTO user_permissions (id, user_id, page_path, can_view, can_create, can_edit, can_delete, company_id, branch_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            randomUUID(),
            newUserId,
            perm.page_path,
            perm.can_view ? 1 : 0,
            perm.can_create ? 1 : 0,
            perm.can_edit ? 1 : 0,
            perm.can_delete ? 1 : 0,
            companyId,
            branchId
          )
        }
      }
    }
  })()

  logAudit(db, {
    tableName: 'users',
    action: 'create',
    recordId: newUserId,
    userId: authUserId,
    companyId: companyId,
    branchId: branchId,
    after: {
      id: newUserId,
      username,
      role: normalizeRoleName(role),
      is_approved: is_approved ? 1 : 0,
    },
  })

  return {
    id: newUserId,
    username,
    email,
    full_name,
    role: normalizeRoleName(role),
    job_title,
    is_approved: is_approved ? 1 : 0,
  }
}, { roles: ['admin'] })
