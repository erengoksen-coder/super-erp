import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { isAdminRole } from '@/lib/auth/permissions-check'
import { ok, fail } from '@/lib/api/response'

/** GET: Son yedekleme tarihi (_app_meta). Sadece admin. */
export const GET = withAuth(async (_request, user) => {
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
  }
  try {
    const db = getDatabase()
    const row = db.prepare("SELECT value FROM _app_meta WHERE key = 'last_backup_at'").get() as { value: string } | undefined
    const lastBackupAt = row?.value ?? null
    return NextResponse.json({ lastBackupAt })
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}, ['admin'])

/** POST: Yedek alındığında çağrılır; son yedekleme tarihini günceller. Sadece admin. Body boş veya { "confirm": true }. */
export const POST = withAuth(async (request: NextRequest, user) => {
  if (!isAdminRole(user.role)) {
    return fail('Yetkisiz', { status: 403 })
  }
  try {
    const db = getDatabase()
    const now = new Date().toISOString()
    db.prepare("INSERT OR REPLACE INTO _app_meta (key, value) VALUES ('last_backup_at', ?)").run(now)
    return ok({ lastBackupAt: now, message: 'Son yedekleme tarihi güncellendi.' })
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : 'Güncelleme başarısız', { status: 500 })
  }
}, ['admin'])
