import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { accountsRepo } from '@/lib/repositories/accounts'
import { logger } from '@/lib/utils/logger'

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

// GET: Tüm cari hesapları listele
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'customer' veya 'supplier'

    const accounts = accountsRepo.getAll(type)
    return ok(accounts, { headers: CACHE_HEADERS_SHORT })
  } catch (error: any) {
    try {
      await logger.error('[Accounts API] GET failed', {
        message: error?.message,
        stack: error?.stack,
      })
    } catch {}
    // Hata mesajını Türkçe'ye çevir
    let errorMessage = error.message || 'Bilinmeyen hata'
    if (errorMessage.includes('no such column')) {
      errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen veritabanını güncelleyin.'
    }
    return fail(errorMessage, { status: 500 })
  }
})

// POST: Yeni cari hesap oluştur
export const POST = withAuth(async (request: NextRequest) => {
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

    // Kod oluştur
    const lastCode = accountsRepo.getLastCode(type)
    
    let codeNumber = 1
    if (lastCode) {
      const lastNum = parseInt(lastCode.replace(/[^0-9]/g, '')) || 0
      codeNumber = lastNum + 1
    }
    
    const prefix = type === 'customer' ? 'MUS' : 'TED'
    const code = `${prefix}-${String(codeNumber).padStart(4, '0')}`
    
    const id = `acc-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    accountsRepo.insert({
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
    })

    return ok({ id, code }, { message: 'Cari hesap oluşturuldu' })
  } catch (error: any) {
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



