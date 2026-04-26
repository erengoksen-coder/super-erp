import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { DEFAULT_BRANCH_ID, DEFAULT_COMPANY_ID, getDatabase } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { rateLimit } from '@/lib/api/rateLimit'
import { hashPassword } from '@/lib/auth/password'
import { ok, fail } from '@/lib/api/response'
import { userSchemas } from '@/lib/validation/schemas'
import { apiLogger } from '@/lib/api/logger'

type UserIdRow = {
  id: string
}

// POST: Kullanıcı kaydı - Ironclad Transactional Version
export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(request, {
      keyPrefix: 'auth:register',
      max: 1000,
      windowMs: 60_000,
    })
    if (!limit.allowed) {
      return fail('Çok fazla deneme. Lütfen bir süre bekleyin.', {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((limit.reset - Date.now()) / 1000).toString(),
        },
      })
    }

    let body: unknown
    try {
      body = await parseJsonBody(request)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Geçersiz JSON'
      return fail(msg, { status: 400 })
    }
    
    if (body == null || typeof body !== 'object' || Array.isArray(body)) {
      return fail('Kayıt bilgileri alınamadı.', { status: 400 })
    }

    const parsed = userSchemas.register.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues || []
      const first = issues[0]
      const field = first?.path?.[0]
      const message = first?.message || 'Geçersiz istek'
      const label = field === 'username' ? 'Kullanıcı adı' : field === 'password' ? 'Şifre' : field === 'email' ? 'E-posta' : field === 'full_name' ? 'Ad soyad' : field === 'role' ? 'Rol' : ''
      const errorText = label ? `${label}: ${message}` : message
      return fail(errorText, { status: 400 })
    }

    const { username, email, password, full_name, job_title } = parsed.data
    const rawRole = (parsed.data.role || 'user').toString().trim().toLowerCase()
    
    const role =
      rawRole === 'admin' || rawRole === 'manager' || rawRole === 'viewer' ? rawRole
      : /y[oö]netici/.test(rawRole) ? 'manager'
      : /g[oö]r[uü]nt[uü]leyici/.test(rawRole) ? 'viewer'
      : 'user'

    const db = getDatabase()
    const passwordHash = hashPassword(password)
    const userId = randomUUID()

    // 1. Pre-Registration Checks
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as UserIdRow | undefined
    if (existingUser) {
      return fail('Bu kullanıcı adı zaten kullanılıyor', { status: 400 })
    }

    if (email) {
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as UserIdRow | undefined
      if (existingEmail) {
        return fail('Bu e-posta adresi zaten kullanılıyor', { status: 400 })
      }
    }

    // 2. Ironclad ATOMIC TRANSACTION for Registration
    const performRegistration = db.transaction(() => {
      // a. Create User
      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, full_name, role, job_title, is_approved, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(userId, username, email ?? null, passwordHash, full_name ?? null, role, job_title ?? null, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

      // b. Assign Role
      const roleId = role === 'admin' ? 'role_admin' : role === 'manager' ? 'role_manager' : role === 'viewer' ? 'role_viewer' : 'role_user'
      db.prepare(`
        INSERT OR IGNORE INTO roles (id, name, description, company_id, branch_id)
        VALUES (?, ?, NULL, ?, ?)
      `).run(roleId, role, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

      db.prepare(`
        INSERT OR IGNORE INTO user_roles (id, user_id, role_id, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(`ur_${userId}_${roleId}`, userId, roleId, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID)

      return userId
    })

    performRegistration()

    // 3. AUDIT LOG (Asynchronous)
    const { AuditService } = await import('@/lib/services/audit')
    AuditService.log({
      userId: userId,
      companyId: DEFAULT_COMPANY_ID,
      branchId: DEFAULT_BRANCH_ID,
      actionType: 'CREATE',
      entityName: 'users',
      entityId: userId,
      description: `Yeni kullanıcı kaydı oluşturuldu (Onay Bekliyor): ${username}`,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || undefined
    }).catch(err => console.error('Audit Log Error:', err))

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

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    apiLogger.error('Register API failed', { error: message })
    return fail('Kayıt yapılırken bir hata oluştu.', { status: 500 })
  }
}
