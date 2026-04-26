import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { hashPassword } from '@/lib/auth/password'
import { ok, fail } from '@/lib/api/response'
import { commonSchemas } from '@/lib/validation/schemas'

// POST: Şifre sıfırlama işlemini tamamla - Ironclad Transactional Version
export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request).catch(() => null)
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
    
    if (!token) {
      return fail('Token gerekli', { status: 400 })
    }

    const parsed = commonSchemas.password.safeParse(newPassword)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Geçersiz şifre formatı'
      return fail(msg, { status: 400 })
    }

    const db = getDatabase()
    
    // 1. Token Geçerlilik Kontrolü
    const row = db.prepare(`
      SELECT prt.token, prt.user_id, prt.expires_at, u.username, u.company_id, u.branch_id
      FROM password_reset_tokens prt
      JOIN users u ON u.id = prt.user_id
      WHERE prt.token = ? AND u.deleted_at IS NULL
    `).get(token) as { token: string; user_id: string; expires_at: string; username: string; company_id: string; branch_id: string } | undefined

    if (!row) {
      return fail('Geçersiz veya süresi dolmuş link', { status: 400 })
    }

    if (new Date(row.expires_at) < new Date()) {
      db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token)
      return fail('Linkin süresi dolmuş. Lütfen tekrar talep edin.', { status: 400 })
    }

    const hashed = hashPassword(parsed.data)

    // 2. Ironclad ATOMIC TRANSACTION for Password Reset
    const finalizeReset = db.transaction(() => {
      // a. Update Password
      db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, row.user_id)
      
      // b. Invalidate all existing tokens for this user
      db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(row.user_id)
    })
    
    finalizeReset()

    // 3. AUDIT LOG (Asynchronous)
    const { AuditService } = await import('@/lib/services/audit')
    AuditService.log({
      userId: row.user_id,
      companyId: row.company_id || DEFAULT_COMPANY_ID,
      branchId: row.branch_id || DEFAULT_BRANCH_ID,
      actionType: 'UPDATE',
      entityName: 'users',
      entityId: row.user_id,
      description: `Şifre başarıyla sıfırlandı: ${row.username}`,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || undefined
    }).catch(err => console.error('Audit Log Error:', err))

    return ok({ message: 'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.' })

  } catch (e) {
    const message = e instanceof Error ? e.message : 'İşlem başarısız'
    return fail(message, { status: 500 })
  }
}
