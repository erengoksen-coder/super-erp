import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { accountsRepo } from '@/lib/repositories/accounts'

type AccountIdRow = {
  id: string
  type?: string | null
}

type AccountUpdateInput = {
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
  updated_by?: string | null
}

// GET: Tek cari hesap detayı
export const GET = withAuth(async (
  request: NextRequest,
  _user,
  context?: unknown
) => {
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id?: string } | Promise<{ id?: string }> } | undefined)?.params
    )
    const accountId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).pop()
    if (!accountId) {
      return fail('ID gerekli', { status: 400 })
    }

    const account = accountsRepo.getById(accountId)

    if (!account) {
      return fail('Cari hesap bulunamadı', { status: 404 })
    }

    return ok(account)
  } catch (error: any) {
    // Hata mesajını Türkçe'ye çevir
    let errorMessage = error.message || 'Bilinmeyen hata'
    if (errorMessage.includes('no such column')) {
      errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen veritabanını güncelleyin.'
    } else if (errorMessage.includes('not found') || errorMessage.includes('bulunamadı')) {
      errorMessage = 'Cari hesap bulunamadı'
    }
    return fail(errorMessage, { status: 500 })
  }
});

// PUT: Cari hesap güncelle
export const PUT = withAuth(async (
  request: NextRequest,
  _user,
  context?: unknown
) => {
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id?: string } | Promise<{ id?: string }> } | undefined)?.params
    )
    const accountId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).pop()
    if (!accountId) {
      return fail('ID gerekli', { status: 400 })
    }
    const body = await parseJsonBody(request) as AccountUpdateInput
    const { name, type, tax_number, phone, email, address, risk_limit, discount_rate, authorized_person_name, authorized_person_phone, updated_by } = body

    // Cari hesabın var olup olmadığını kontrol et
    const existingAccount = accountsRepo.getById(accountId) as AccountIdRow | undefined
    if (!existingAccount) {
      return fail('Cari hesap bulunamadı', { status: 404 })
    }

    if (!name) {
      return fail('Müşteri/Tedarikçi adı gerekli', { status: 400 })
    }

    // Güncelle
    accountsRepo.update(accountId, {
      name,
      type: type || existingAccount.type || null,
      tax_number,
      phone,
      email,
      address,
      risk_limit: risk_limit ?? null,
      discount_rate: discount_rate ?? null,
      authorized_person_name: authorized_person_name || null,
      authorized_person_phone: authorized_person_phone || null,
      updated_by,
    })

    return ok(null, { message: 'Cari hesap güncellendi' })
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
});

// DELETE: Cari hesap sil
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: unknown
) => {
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id?: string } | Promise<{ id?: string }> } | undefined)?.params
    )
    const accountId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).pop()
    if (!accountId) {
      return fail('ID gerekli', { status: 400 })
    }

    // Cari hesabın var olup olmadığını kontrol et
    const existingAccount = accountsRepo.getById(accountId)
    if (!existingAccount) {
      return fail('Cari hesap bulunamadı', { status: 404 })
    }

    const isAdmin = ['admin', 'yönetici', 'yonetici'].includes((user.role || '').toString().trim().toLowerCase())
    if (!isAdmin) {
      // Admin değilse: cari hesabın kullanılıp kullanılmadığını kontrol et
      const usage = accountsRepo.getUsageCounts(accountId, existingAccount.name)
      if (usage.usedInMaterials > 0 || usage.usedInOrders > 0) {
        return fail('Bu cari hesap kullanılıyor, silinemez', { status: 400 })
      }
    }

    // Sil
    accountsRepo.delete(accountId)

    return ok(null, { message: 'Cari hesap silindi' })
  } catch (error: any) {
    // Hata mesajını Türkçe'ye çevir
    let errorMessage = error.message || 'Bilinmeyen hata'
    if (errorMessage.includes('no such column')) {
      errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen veritabanını güncelleyin.'
    } else if (errorMessage.includes('kullanılıyor')) {
      errorMessage = 'Bu cari hesap kullanılıyor, silinemez'
    }
    return fail(errorMessage, { status: 500 })
  }
});

