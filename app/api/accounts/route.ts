import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { accountsRepo } from '@/lib/repositories/accounts'
import { getDatabase } from '@/lib/database/db'
import { logger } from '@/lib/utils/logger'
import { apiLogger } from '@/lib/api/logger'
import { PAGINATION } from '@/lib/constants'

type AccountInput = {
  name?: string
  type?: string
  tax_number?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  risk_limit?: number | null
  discount_rate?: number | null
  authorized_person_name?: string | null
  authorized_person_phone?: string | null
  created_by?: string | null
}

// GET: Tüm cari hesapları listele (bayi sadece kendi carisini /api/bayi/account ile görür)
export const GET = withAuth(async (request: NextRequest, user: { role?: string }) => {
  const role = (user?.role ?? '').toString().trim().toLowerCase()
  if (role === 'bayi') {
    return fail('Bayi kullanıcıları cari listesine erişemez. Cari Hesabım sayfasını kullanın.', { status: 403 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const typeParam = (searchParams.get('type') ?? '').trim().toLowerCase()
    // Sadece customer/supplier ise filtrele; tümü/boş/all → hem müşteri hem tedarikçi
    const type =
      typeParam === 'customer' ? 'customer' :
      typeParam === 'supplier' ? 'supplier' :
      null
    const balanceParam = (searchParams.get('balance') ?? '').trim().toLowerCase()
    const balanceFilter =
      balanceParam === 'debt' ? 'debt' as const :
      balanceParam === 'credit' ? 'credit' as const :
      balanceParam === 'zero' ? 'zero' as const :
      null
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT), 10) || PAGINATION.DEFAULT_LIMIT),
      PAGINATION.MAX_LIMIT
    )
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0)

    const { rows, total } = accountsRepo.getPage(type, limit, offset, balanceFilter)
    return ok(rows, { headers: CACHE_HEADERS_SHORT, meta: { total, limit, offset } })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Accounts API GET failed')
    apiLogger.error('Accounts API GET failed', { error: err.message, stack: err.stack })
    try {
      await logger.error('[Accounts API] GET failed', { message: err.message, stack: err.stack })
    } catch {}
    let errorMessage = err.message || 'Bilinmeyen hata'
    if (errorMessage.includes('no such column')) {
      errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen veritabanını güncelleyin.'
    }
    return fail(errorMessage, { status: 500 })
  }
})

// POST: Yeni cari hesap oluştur (bayi sadece görüntüleme, ekleme yapamaz)
export const POST = withAuth(async (request: NextRequest, user: { role?: string }) => {
  const role = (user?.role ?? '').toString().trim().toLowerCase()
  if (role === 'bayi') {
    return fail('Bayi kullanıcıları cari ekleyemez', { status: 403 })
  }
  try {
    let body: AccountInput
    try {
      body = await parseJsonBody(request) as AccountInput
    } catch {
      return fail('Geçersiz JSON', { status: 400 })
    }
    const { name, type = 'customer', tax_number, phone, email, address, risk_limit, discount_rate, authorized_person_name, authorized_person_phone, created_by } = body

    if (!name) {
      return fail('Müşteri/Tedarikçi adı gerekli', { status: 400 })
    }

    // Benzersiz kod: 001'den başlayan ilk kullanılmayan numara (MUS-001, MUS-002, ...)
    const db = getDatabase()
    const prefix = type === 'customer' ? 'MUS' : 'TED'
    const existingRows = db.prepare(
      'SELECT code FROM accounts WHERE type = ? AND deleted_at IS NULL AND code LIKE ?'
    ).all(type, `${prefix}-%`) as { code: string }[]
    const usedNumbers = new Set<number>()
    for (const row of existingRows) {
      const num = parseInt(row.code.replace(/[^0-9]/g, ''), 10)
      if (!isNaN(num)) usedNumbers.add(num)
    }
    let codeNumber = 1
    while (usedNumbers.has(codeNumber)) codeNumber++
    const code = `${prefix}-${String(codeNumber).padStart(3, '0')}`

    const id = `acc-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const accountData = {
      id,
      code,
      name,
      type,
      tax_number,
      phone,
      email,
      address,
      risk_limit: risk_limit ?? null,
      discount_rate: discount_rate ?? null,
      authorized_person_name: authorized_person_name || null,
      authorized_person_phone: authorized_person_phone || null,
      created_by,
    }

    try {
      accountsRepo.insert(accountData)
    } catch (insertErr: any) {
      // Aynı anda iki istek aynı kodu aldıysa tekrar dene (başka bilgisayar / çoklu sekme)
      if (insertErr?.message?.includes('UNIQUE') || insertErr?.message?.includes('zaten kullanılıyor')) {
        for (let retry = 1; retry <= 20; retry++) {
          const nextNum = codeNumber + retry
          const nextCode = `${prefix}-${String(nextNum).padStart(3, '0')}`
          const exists = db.prepare('SELECT 1 FROM accounts WHERE code = ? AND deleted_at IS NULL').get(nextCode)
          if (!exists) {
            accountData.code = nextCode
            accountData.id = `acc-${Date.now()}-${Math.random().toString(36).substring(7)}`
            try {
              accountsRepo.insert(accountData)
              return ok({ id: accountData.id, code: accountData.code }, { message: 'Cari hesap oluşturuldu' })
            } catch {
              continue
            }
          }
        }
      }
      throw insertErr
    }

    return ok({ id, code }, { message: 'Cari hesap oluşturuldu' })
  } catch (error: any) {
    apiLogger.error('Accounts API POST failed', { error: error?.message, stack: error?.stack })
    // Hata mesajını Türkçe'ye çevir
    let errorMessage = error.message || 'Bilinmeyen hata'
    if (errorMessage.includes('no such column')) {
      errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen veritabanını güncelleyin.'
    } else if (errorMessage.includes('UNIQUE constraint')) {
      errorMessage = 'Bu kod zaten kullanılıyor. Lütfen farklı bir kod seçin.'
    } else if (errorMessage.includes('FOREIGN KEY')) {
      errorMessage = 'İlişkili kayıt bulunamadı.'
    } else if (errorMessage.includes('NOT NULL')) {
      errorMessage = 'Zorunlu alanlar eksik.'
    }
    return fail(errorMessage, { status: 500 })
  }
})

// DELETE: Tüm carileri sil — SADECE bilinçli kullanıcı isteği (all=1 + X-Confirm-Delete-All-Accounts).
// Otomatik veya yanlışlıkla tetiklenmeyi önlemek için özel header zorunludur; girilen veriler otomatik silinmez.
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all')
    const confirmHeader = request.headers.get('X-Confirm-Delete-All-Accounts')
    if (all !== '1' && all !== 'true') {
      return fail('Tümünü silmek için ?all=1 gerekli', { status: 400 })
    }
    if (confirmHeader !== '1' && confirmHeader !== 'true') {
      return fail('Otomatik silme kapalı. Tüm carileri silmek için arayüzdeki butonu ve onay adımlarını kullanın.', { status: 400 })
    }
    const db = getDatabase()
    // Çek/senet kaydı olan carileri silme; sadece referansı olmayanları sil
    const result = db.prepare(`
      UPDATE accounts SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE deleted_at IS NULL
        AND id NOT IN (SELECT DISTINCT account_id FROM checks_and_notes WHERE deleted_at IS NULL AND account_id IS NOT NULL)
    `).run()
    return ok({ deleted_count: result.changes }, { message: `${result.changes} cari hesap silindi (çek/senet kaydı olan cariler korundu)` })
  } catch (error: any) {
    apiLogger.error('Accounts API DELETE failed', { error: error?.message, stack: error?.stack })
    return fail(error.message || 'Silinemedi', { status: 500 })
  }
}, ['admin'])

