import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'

/**
 * Bayi portal kullanıcısı: kendi bilgisi + bağlı olduğu cari (dealer_name).
 * Sadece role=bayi kullanıcılar erişebilir.
 */
export const GET = withAuth(
  async (request: NextRequest, user: { userId: string; role: string }) => {
    const normalizedRole = (user.role || '').toString().trim().toLowerCase()
    if (normalizedRole !== 'bayi') {
      return fail('Bu alan sadece bayi kullanıcıları içindir', { status: 403 })
    }

    const db = getDatabase()
    const row = db.prepare(`
      SELECT id, username, email, full_name, role, job_title, dealer_name
      FROM users
      WHERE id = ? AND deleted_at IS NULL
    `).get(user.userId) as { id: string; username: string; email: string | null; full_name: string | null; role: string; job_title: string | null; dealer_name: string | null } | undefined

    if (!row) {
      return fail('Kullanıcı bulunamadı', { status: 404 })
    }

    return ok({
      user: {
        id: row.id,
        username: row.username,
        email: row.email,
        full_name: row.full_name,
        role: row.role,
        job_title: row.job_title,
        dealer_name: row.dealer_name?.trim() || null,
      },
    })
  }
)
