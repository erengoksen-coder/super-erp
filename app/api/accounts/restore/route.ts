import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { getDatabase } from '@/lib/database/db'
import { apiLogger } from '@/lib/api/logger'

/**
 * POST: Silinmiş (soft-deleted) tüm carileri geri yükle.
 * deleted_at dolu olan kayıtların deleted_at alanı NULL yapılır.
 * Sadece admin.
 */
export const POST = withAuth(async () => {
  try {
    const db = getDatabase()
    const result = db.prepare(
      'UPDATE accounts SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE deleted_at IS NOT NULL'
    ).run()
    return ok(
      { restored_count: result.changes },
      { message: `${result.changes} cari hesap geri yüklendi.` }
    )
  } catch (error: any) {
    apiLogger.error('Accounts restore failed', { error: error?.message, stack: error?.stack })
    return fail(error.message || 'Geri yükleme başarısız', { status: 500 })
  }
}, ['admin'])
